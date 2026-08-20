<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\GoodsReceipt;
use App\Models\MenuItem;
use App\Models\MenuRecipeBom;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PurchaseOrder;
use App\Models\RawMaterial;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AutoProcurementTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $user;
    protected Supplier $supplierMeat;
    protected Supplier $supplierVeggie;
    protected RawMaterial $beef;
    protected RawMaterial $carrot;
    protected MenuItem $rendang;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Procurement Test Tenant',
            'slug' => 'procurement-test',
            'is_active' => true,
        ]);

        $role = Role::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Purchasing Manager',
            'slug' => 'purchasing-mgr',
            'permissions' => ['*'],
        ]);

        $this->user = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Admin Purchasing',
            'email' => 'purchasing@test.com',
            'password' => bcrypt('password'),
            'role_id' => $role->id,
        ]);

        $this->supplierMeat = Supplier::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'PT Daging Segar Utama',
            'phone' => '0812345678',
            'email' => 'sales@dagingsegar.com',
        ]);

        $this->supplierVeggie = Supplier::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'CV Sayur Mayur Berkah',
            'phone' => '0898765432',
        ]);

        // Beef: 5 kg stock, 10 kg min stock (needs at least 5 kg even without production)
        $this->beef = RawMaterial::create([
            'tenant_id' => $this->tenant->id,
            'supplier_id' => $this->supplierMeat->id,
            'name' => 'Daging Sapi Has Luar',
            'code' => 'RAW-BEEF',
            'category' => 'Daging',
            'unit' => 'kg',
            'default_purchase_price' => 120000,
            'minimum_stock' => 10,
            'current_stock' => 5,
        ]);

        // Carrot: 2 kg stock, 5 kg min stock
        $this->carrot = RawMaterial::create([
            'tenant_id' => $this->tenant->id,
            'supplier_id' => $this->supplierVeggie->id,
            'name' => 'Wortel Import',
            'code' => 'RAW-WORTEL',
            'category' => 'Sayuran',
            'unit' => 'kg',
            'default_purchase_price' => 15000,
            'minimum_stock' => 5,
            'current_stock' => 2,
        ]);

        // Rendang requires 0.25 kg beef per portion
        $this->rendang = MenuItem::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Rendang Sapi Spesial',
            'slug' => 'rendang-sapi-spesial',
            'portion_unit' => 'porsi',
            'selling_price' => 45000,
            'is_active' => true,
        ]);

        MenuRecipeBom::create([
            'tenant_id' => $this->tenant->id,
            'menu_item_id' => $this->rendang->id,
            'raw_material_id' => $this->beef->id,
            'quantity' => 0.25,
            'unit' => 'kg',
            'cost_per_unit' => 120000,
            'subtotal_cost' => 30000,
        ]);
    }

    public function test_can_calculate_auto_suggest_po_shortage(): void
    {
        Sanctum::actingAs($this->user);

        $customer = Customer::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Client Acara',
            'phone' => '0811223344',
        ]);

        // Tomorrow order: 40 portions of Rendang -> requires 10 kg beef
        // Beef current stock = 5, min stock = 10 -> Shortage = (10 + 10) - 5 = 15 kg beef!
        // Carrot has no production usage, but current = 2, min = 5 -> Shortage = (0 + 5) - 2 = 3 kg carrot!
        $order = Order::create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $customer->id,
            'order_number' => 'ORD-PROC-001',
            'event_type' => 'Prasmanan',
            'delivery_date' => now()->addDay()->toDateString(),
            'delivery_time' => '12:00',
            'delivery_address' => 'Gedung Kesenian',
            'status' => 'confirmed',
            'total_amount' => 1800000,
        ]);

        OrderItem::create([
            'tenant_id' => $this->tenant->id,
            'order_id' => $order->id,
            'menu_item_id' => $this->rendang->id,
            'item_name' => $this->rendang->name,
            'quantity' => 40,
            'unit_price' => 45000,
            'subtotal_price' => 1800000,
        ]);

        $response = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->getJson('/api/v1/tenant/purchase-orders/suggestions?target_date=' . now()->addDay()->toDateString());

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.total_shortage_items', 2);

        $groups = $response->json('data.suggestions_by_supplier');
        $this->assertCount(2, $groups);

        // Check Meat Supplier group
        $meatGroup = collect($groups)->firstWhere('supplier_id', $this->supplierMeat->id);
        $this->assertNotNull($meatGroup);
        $beefItem = collect($meatGroup['items'])->firstWhere('raw_material_id', $this->beef->id);
        $this->assertNotNull($beefItem);
        $this->assertEquals(15.0, $beefItem['suggested_quantity']);
        $this->assertEquals(1800000.0, $beefItem['estimated_subtotal']); // 15 kg * 120,000
    }

    public function test_can_create_pos_from_suggestions_and_fulfill_goods_receipt(): void
    {
        Sanctum::actingAs($this->user);

        $suggestionsPayload = [
            'suggestions' => [
                [
                    'supplier_id' => $this->supplierMeat->id,
                    'items' => [
                        [
                            'raw_material_id' => $this->beef->id,
                            'suggested_quantity' => 15,
                            'unit_price' => 120000,
                        ],
                    ],
                ],
            ],
        ];

        // 1. Create Draft PO from suggestions
        $createRes = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson('/api/v1/tenant/purchase-orders/from-suggestions', $suggestionsPayload);

        $createRes->assertStatus(201);
        $createRes->assertJsonPath('success', true);
        $poData = $createRes->json('data.0');
        $poId = $poData['id'];

        $this->assertDatabaseHas('purchase_orders', [
            'id' => $poId,
            'tenant_id' => $this->tenant->id,
            'supplier_id' => $this->supplierMeat->id,
            'status' => 'draft',
        ]);

        // 2. Approve PO
        $approveRes = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->patchJson("/api/v1/tenant/purchase-orders/{$poId}/approve");

        $approveRes->assertStatus(200);
        $receiptId = $approveRes->json('data.goods_receipt.id');

        // 3. Receive Goods in Warehouse
        $initialStock = (float) $this->beef->current_stock; // 5 kg
        $receiveRes = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson("/api/v1/tenant/inventory/goods-receipts/{$receiptId}/receive", [
                'notes' => 'Diterima utuh tanpa cacat',
                'items' => [
                    [
                        'raw_material_id' => $this->beef->id,
                        'quantity_received' => 15,
                        'unit_cost' => 125000, // Price updated from supplier
                    ],
                ],
            ]);

        $receiveRes->assertStatus(200);
        $receiveRes->assertJsonPath('success', true);

        // Verify Stock Updated: 5 kg + 15 kg = 20 kg
        $this->beef->refresh();
        $this->assertEquals($initialStock + 15.0, (float) $this->beef->current_stock);
        $this->assertEquals(125000, (float) $this->beef->default_purchase_price);

        // Verify PO is marked completed
        $this->assertDatabaseHas('purchase_orders', [
            'id' => $poId,
            'status' => 'completed',
        ]);
    }
}
