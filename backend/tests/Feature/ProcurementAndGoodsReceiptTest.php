<?php

namespace Tests\Feature;

use App\Models\GoodsReceipt;
use App\Models\PurchaseOrder;
use App\Models\RawMaterial;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProcurementAndGoodsReceiptTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $user;
    protected Supplier $supplier;
    protected RawMaterial $material1;
    protected RawMaterial $material2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Berkah Catering Procurement',
            'slug' => 'berkah-procurement',
            'email' => 'procurement@berkah.id',
            'business_type' => 'catering_box',
            'onboarding_completed' => true,
        ]);

        $this->user = User::create([
            'name' => 'Procurement Officer',
            'email' => 'purchasing@berkah.id',
            'password' => bcrypt('password'),
            'role' => 'owner',
            'tenant_id' => $this->tenant->id,
            'is_active' => true,
        ]);

        $this->supplier = Supplier::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'CV. Beras & Daging Segar',
            'contact_person' => 'Pak Haji Slamet',
            'phone' => '08123456780',
            'city' => 'Jakarta Timur',
        ]);

        $this->material1 = RawMaterial::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Daging Ayam Segar',
            'code' => 'RM-AYAM-01',
            'category' => 'Daging/Unggas',
            'unit' => 'kg',
            'default_purchase_price' => 45000,
            'minimum_stock' => 10,
            'current_stock' => 5,
            'supplier_id' => $this->supplier->id,
        ]);

        $this->material2 = RawMaterial::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Beras Ramos Super',
            'code' => 'RM-BERAS-01',
            'category' => 'Bahan Pokok',
            'unit' => 'kg',
            'default_purchase_price' => 15000,
            'minimum_stock' => 20,
            'current_stock' => 20,
            'supplier_id' => $this->supplier->id,
        ]);
    }

    public function test_can_create_purchase_order_with_items(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson('/api/v1/tenant/purchase-orders', [
                'supplier_id' => $this->supplier->id,
                'order_date' => now()->toDateString(),
                'notes' => 'PO Belanja Mingguan Dapur',
                'items' => [
                    [
                        'raw_material_id' => $this->material1->id,
                        'quantity_ordered' => 25,
                        'unit_price' => 46000,
                    ],
                    [
                        'raw_material_id' => $this->material2->id,
                        'quantity_ordered' => 50,
                        'unit_price' => 15000,
                    ],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.total_amount', '1900000.00'); // (25*46000) + (50*15000) = 1150000 + 750000 = 1900000

        $this->assertDatabaseHas('purchase_orders', [
            'tenant_id' => $this->tenant->id,
            'supplier_id' => $this->supplier->id,
            'status' => 'draft',
        ]);
    }

    public function test_approving_po_auto_generates_draft_goods_receipt(): void
    {
        // 1. Create PO
        $po = PurchaseOrder::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-20260819-0001',
            'supplier_id' => $this->supplier->id,
            'status' => 'draft',
            'order_date' => now()->toDateString(),
            'total_amount' => 920000,
            'created_by' => $this->user->id,
        ]);

        $po->items()->create([
            'raw_material_id' => $this->material1->id,
            'quantity_ordered' => 20,
            'unit_price' => 46000,
            'subtotal' => 920000,
        ]);

        // 2. Approve PO
        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->patchJson("/api/v1/tenant/purchase-orders/{$po->id}/approve");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.purchase_order.status', 'approved')
            ->assertJsonPath('data.goods_receipt.status', 'draft');

        // Stock in warehouse should NOT have increased yet!
        $this->material1->refresh();
        $this->assertEquals(5.0, (float) $this->material1->current_stock);

        // A GoodsReceipt should exist in DB
        $this->assertDatabaseHas('goods_receipts', [
            'tenant_id' => $this->tenant->id,
            'purchase_order_id' => $po->id,
            'status' => 'draft',
        ]);
    }

    public function test_receiving_goods_receipt_increases_warehouse_stock_writes_ledger_and_completes_po(): void
    {
        // 1. Create & Approve PO
        $po = PurchaseOrder::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-20260819-0002',
            'supplier_id' => $this->supplier->id,
            'status' => 'draft',
            'order_date' => now()->toDateString(),
            'total_amount' => 920000,
            'created_by' => $this->user->id,
        ]);

        $poItem = $po->items()->create([
            'raw_material_id' => $this->material1->id,
            'quantity_ordered' => 20,
            'unit_price' => 46000,
            'subtotal' => 920000,
        ]);

        $receipt = GoodsReceipt::create([
            'tenant_id' => $this->tenant->id,
            'receipt_number' => 'GR-20260819-0002',
            'purchase_order_id' => $po->id,
            'supplier_id' => $this->supplier->id,
            'status' => 'draft',
        ]);

        $receiptItem = $receipt->items()->create([
            'raw_material_id' => $this->material1->id,
            'purchase_order_item_id' => $poItem->id,
            'quantity_expected' => 20,
            'quantity_received' => 0,
            'unit_cost' => 46000,
            'total_cost' => 920000,
        ]);

        // 2. Warehouse staff confirms receipt in warehouse
        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson("/api/v1/tenant/inventory/goods-receipts/{$receipt->id}/receive", [
                'notes' => 'Surat Jalan Supplier #SJ-9981 tiba lengkap dan segar',
                'items' => [
                    [
                        'goods_receipt_item_id' => $receiptItem->id,
                        'quantity_received' => 20,
                        'unit_cost' => 46000,
                    ],
                ],
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'received');

        // 3. Verify stock increased in warehouse from 5 to 25
        $this->material1->refresh();
        $this->assertEquals(25.0, (float) $this->material1->current_stock);
        $this->assertEquals(46000.0, (float) $this->material1->default_purchase_price);

        // 4. Verify PO status is now completed
        $po->refresh();
        $this->assertEquals('completed', $po->status);

        // 5. Verify StockLedger entry recorded
        $this->assertDatabaseHas('stock_ledgers', [
            'tenant_id' => $this->tenant->id,
            'raw_material_id' => $this->material1->id,
            'type' => 'in',
            'quantity' => 20,
            'stock_before' => 5,
            'stock_after' => 25,
            'reference_type' => 'purchase_receipt',
            'reference_id' => $po->id,
        ]);
    }
}
