<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\MenuRecipeBom;
use App\Models\RawMaterial;
use App\Models\StockLedger;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryManagementTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $user;
    protected RawMaterial $material1;
    protected RawMaterial $material2;
    protected MenuItem $menuItem;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Berkah Catering Inventory',
            'slug' => 'berkah-catering-inventory',
            'email' => 'inventory@berkah.id',
            'business_type' => 'catering_box',
            'onboarding_completed' => true,
        ]);

        $this->user = User::create([
            'name' => 'Gudang Manager',
            'email' => 'gudang@berkah.id',
            'password' => bcrypt('password'),
            'role' => 'owner',
            'tenant_id' => $this->tenant->id,
            'is_active' => true,
        ]);

        $this->material1 = RawMaterial::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Daging Ayam Fillet',
            'code' => 'RM-AYAM-01',
            'category' => 'Daging/Unggas',
            'unit' => 'kg',
            'default_purchase_price' => 45000,
            'minimum_stock' => 10,
            'current_stock' => 5, // Below minimum stock
        ]);

        $this->material2 = RawMaterial::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Beras Ramos Super',
            'code' => 'RM-BERAS-01',
            'category' => 'Bahan Pokok',
            'unit' => 'kg',
            'default_purchase_price' => 15000,
            'minimum_stock' => 20,
            'current_stock' => 50, // Safe stock
        ]);

        $category = MenuCategory::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Olahan Ayam',
            'slug' => 'olahan-ayam',
        ]);

        $this->menuItem = MenuItem::create([
            'tenant_id' => $this->tenant->id,
            'menu_category_id' => $category->id,
            'name' => 'Ayam Bakar Madu',
            'slug' => 'ayam-bakar-madu',
            'selling_price' => 25000,
            'calculated_hpp' => 9000,
        ]);

        // Recipe: 0.2 kg Ayam per portion = 0.2 * 45000 = 9000 HPP
        MenuRecipeBom::create([
            'tenant_id' => $this->tenant->id,
            'menu_item_id' => $this->menuItem->id,
            'raw_material_id' => $this->material1->id,
            'quantity' => 0.2,
            'unit' => 'kg',
        ]);
    }

    public function test_can_record_stock_in_and_increase_current_stock(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson('/api/v1/tenant/inventory/stock-in', [
                'raw_material_id' => $this->material1->id,
                'quantity' => 15,
                'unit_cost' => 46000,
                'notes' => 'Belanja Pasar Kramat Jati - Nota #001',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.type', 'in')
            ->assertJsonPath('data.quantity', '15.00')
            ->assertJsonPath('data.stock_before', '5.00')
            ->assertJsonPath('data.stock_after', '20.00');

        $this->material1->refresh();
        $this->assertEquals(20.0, (float) $this->material1->current_stock);
        $this->assertEquals(46000.0, (float) $this->material1->default_purchase_price);

        // HPP of Ayam Bakar Madu should be auto recalculated: 0.2 * 46000 = 9200
        $this->menuItem->refresh();
        $this->assertEquals(9200.0, (float) $this->menuItem->calculated_hpp);
    }

    public function test_can_record_stock_out(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson('/api/v1/tenant/inventory/stock-out', [
                'raw_material_id' => $this->material2->id,
                'quantity' => 10,
                'reference_type' => 'order_usage',
                'notes' => 'Pemakaian produksi catering 50 pax',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.type', 'out')
            ->assertJsonPath('data.quantity', '10.00')
            ->assertJsonPath('data.stock_before', '50.00')
            ->assertJsonPath('data.stock_after', '40.00');

        $this->material2->refresh();
        $this->assertEquals(40.0, (float) $this->material2->current_stock);
    }

    public function test_can_record_stock_opname_adjustment(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson('/api/v1/tenant/inventory/adjust', [
                'raw_material_id' => $this->material1->id,
                'physical_stock' => 8, // System stock is 5, so +3 adjustment
                'notes' => 'Hasil hitung ulang freezer',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.type', 'adjustment')
            ->assertJsonPath('data.quantity', '3.00')
            ->assertJsonPath('data.stock_before', '5.00')
            ->assertJsonPath('data.stock_after', '8.00');

        $this->material1->refresh();
        $this->assertEquals(8.0, (float) $this->material1->current_stock);
    }

    public function test_can_get_inventory_summary_and_alerts(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson('/api/v1/tenant/inventory/summary');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_items', 2)
            ->assertJsonPath('data.safe_items_count', 1)
            ->assertJsonPath('data.low_stock_count', 1)
            ->assertJsonPath('data.out_of_stock_count', 0);

        // Test low-stock endpoint
        $lowStockRes = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson('/api/v1/tenant/inventory/low-stock');

        $lowStockRes->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $this->material1->id);
    }

    public function test_can_get_stock_ledgers_history(): void
    {
        // Create sample ledger
        StockLedger::create([
            'tenant_id' => $this->tenant->id,
            'raw_material_id' => $this->material1->id,
            'type' => 'in',
            'quantity' => 10,
            'stock_before' => 0,
            'stock_after' => 10,
            'unit_cost' => 45000,
            'total_cost' => 450000,
            'notes' => 'Initial batch',
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson('/api/v1/tenant/inventory/ledgers?type=in');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.type', 'in')
            ->assertJsonPath('data.0.raw_material.name', 'Daging Ayam Fillet');
    }
}
