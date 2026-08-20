<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\RawMaterial;
use App\Models\Role;
use App\Models\StockLedger;
use App\Models\StockTransfer;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BranchAndStockTransferTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $user;
    protected RawMaterial $chicken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Garuda Boga Catering',
            'slug' => 'garuda-boga',
            'is_active' => true,
        ]);

        $role = Role::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Logistics Admin',
            'slug' => 'logistics-admin',
            'permissions' => ['*'],
        ]);

        $this->user = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Pak Budi Gudang',
            'email' => 'gudang@garudaboga.com',
            'password' => bcrypt('password'),
            'role_id' => $role->id,
        ]);

        $this->chicken = RawMaterial::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Ayam Broiler Fillet',
            'category' => 'Daging & Unggas',
            'unit' => 'kg',
            'default_purchase_price' => 45000,
            'current_stock' => 100,
        ]);
    }

    public function test_can_list_and_create_branches(): void
    {
        Sanctum::actingAs($this->user);

        // 1. List branches (triggers auto-seeding of Main Branch)
        $listRes = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->getJson('/api/v1/tenant/branches');

        $listRes->assertStatus(200);
        $listRes->assertJsonPath('success', true);
        $branches = $listRes->json('data');
        $this->assertCount(1, $branches);
        $this->assertTrue($branches[0]['is_main']);

        // 2. Create satellite branch (e.g. Dapur Satelit BSD)
        $createRes = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson('/api/v1/tenant/branches', [
                'name' => 'Dapur Cabang BSD Serpong',
                'code' => 'KDS-BSD',
                'city' => 'Tangerang Selatan',
                'address' => 'Ruko BSD Boulevard No. 12',
                'phone' => '081288990011',
                'pic_name' => 'Chef Anton',
            ]);

        $createRes->assertStatus(201);
        $this->assertDatabaseHas('branches', [
            'tenant_id' => $this->tenant->id,
            'name' => 'Dapur Cabang BSD Serpong',
            'code' => 'KDS-BSD',
        ]);
    }

    public function test_cannot_delete_main_branch(): void
    {
        Sanctum::actingAs($this->user);

        $mainBranch = Branch::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dapur Utama',
            'is_main' => true,
            'is_active' => true,
        ]);

        $delRes = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->deleteJson("/api/v1/tenant/branches/{$mainBranch->id}");

        $delRes->assertStatus(422);
    }

    public function test_can_execute_stock_transfer_workflow(): void
    {
        Sanctum::actingAs($this->user);

        $branchHQ = Branch::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dapur Pusat HQ',
            'is_main' => true,
        ]);

        $branchBSD = Branch::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dapur Cabang BSD',
            'is_main' => false,
        ]);

        // 1. Create Stock Transfer Request (25 kg Chicken from HQ to BSD)
        $createRes = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson('/api/v1/tenant/stock-transfers', [
                'from_branch_id' => $branchHQ->id,
                'to_branch_id' => $branchBSD->id,
                'notes' => 'Permintaan stok darurat untuk prasmanan pernikahan',
                'items' => [
                    [
                        'raw_material_id' => $this->chicken->id,
                        'quantity' => 25,
                        'unit' => 'kg',
                    ],
                ],
            ]);

        $createRes->assertStatus(201);
        $transferId = $createRes->json('data.id');
        $this->assertDatabaseHas('stock_transfers', [
            'id' => $transferId,
            'status' => 'pending',
        ]);

        // Initial stock was 100 kg
        $this->chicken->refresh();
        $this->assertEquals(100, $this->chicken->current_stock);

        // 2. Ship Transfer (Status -> in_transit, Stock HQ -> -25 kg)
        $shipRes = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson("/api/v1/tenant/stock-transfers/{$transferId}/ship");

        $shipRes->assertStatus(200);
        $this->assertDatabaseHas('stock_transfers', [
            'id' => $transferId,
            'status' => 'in_transit',
        ]);

        $this->chicken->refresh();
        $this->assertEquals(75, $this->chicken->current_stock);

        // Verify Stock Ledger Out
        $this->assertDatabaseHas('stock_ledgers', [
            'tenant_id' => $this->tenant->id,
            'branch_id' => $branchHQ->id,
            'raw_material_id' => $this->chicken->id,
            'type' => 'out',
            'quantity' => 25,
        ]);

        // 3. Receive Transfer (Status -> completed, Stock BSD -> +25 kg)
        $receiveRes = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson("/api/v1/tenant/stock-transfers/{$transferId}/receive");

        $receiveRes->assertStatus(200);
        $this->assertDatabaseHas('stock_transfers', [
            'id' => $transferId,
            'status' => 'completed',
        ]);

        // Stock restored back to system +25 = 100
        $this->chicken->refresh();
        $this->assertEquals(100, $this->chicken->current_stock);

        // Verify Stock Ledger In
        $this->assertDatabaseHas('stock_ledgers', [
            'tenant_id' => $this->tenant->id,
            'branch_id' => $branchBSD->id,
            'raw_material_id' => $this->chicken->id,
            'type' => 'in',
            'quantity' => 25,
        ]);
    }
}
