<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\MenuItem;
use App\Models\MenuPackage;
use App\Models\MenuPackageItem;
use App\Models\MenuRecipeBom;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductionPlan;
use App\Models\ProductionTask;
use App\Models\RawMaterial;
use App\Models\Role;
use App\Models\StockLedger;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class KitchenProductionTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $user;
    protected RawMaterial $chicken;
    protected RawMaterial $rice;
    protected MenuItem $menuItemAyam;
    protected MenuPackage $packageBox;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Berkah Kitchen Test',
            'slug' => 'berkah-kitchen-test',
            'email' => 'kitchen@berkah.com',
            'is_active' => true,
        ]);

        $role = Role::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Kitchen Head',
            'slug' => 'kitchen-head',
            'permissions' => ['*'],
        ]);

        $this->user = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Chef Juna',
            'email' => 'chef@berkah.com',
            'password' => bcrypt('password'),
            'role_id' => $role->id,
        ]);

        // Raw Materials
        $this->chicken = RawMaterial::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Daging Ayam Fillet',
            'code' => 'RAW-AYAM',
            'category' => 'Daging & Unggas',
            'unit' => 'kg',
            'default_purchase_price' => 45000,
            'minimum_stock' => 5,
            'current_stock' => 20, // 20 kg in stock
        ]);

        $this->rice = RawMaterial::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Beras Pandan Wangi',
            'code' => 'RAW-BERAS',
            'category' => 'Bahan Kering',
            'unit' => 'kg',
            'default_purchase_price' => 15000,
            'minimum_stock' => 10,
            'current_stock' => 50, // 50 kg in stock
        ]);

        // Menu Item (0.2 kg chicken + 0.15 kg rice per portion)
        $this->menuItemAyam = MenuItem::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Ayam Bakar Madu',
            'slug' => 'ayam-bakar-madu',
            'portion_unit' => 'porsi',
            'selling_price' => 25000,
            'is_active' => true,
        ]);

        MenuRecipeBom::create([
            'tenant_id' => $this->tenant->id,
            'menu_item_id' => $this->menuItemAyam->id,
            'raw_material_id' => $this->chicken->id,
            'quantity' => 0.20,
            'unit' => 'kg',
            'cost_per_unit' => 45000,
            'subtotal_cost' => 9000,
        ]);

        MenuRecipeBom::create([
            'tenant_id' => $this->tenant->id,
            'menu_item_id' => $this->menuItemAyam->id,
            'raw_material_id' => $this->rice->id,
            'quantity' => 0.15,
            'unit' => 'kg',
            'cost_per_unit' => 15000,
            'subtotal_cost' => 2250,
        ]);

        // Package with 1 Ayam Bakar Madu
        $this->packageBox = MenuPackage::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Paket Nasi Kotak Ayam Madu',
            'slug' => 'paket-nasi-kotak-ayam-madu',
            'package_type' => 'box',
            'selling_price' => 35000,
            'is_active' => true,
        ]);

        MenuPackageItem::create([
            'tenant_id' => $this->tenant->id,
            'menu_package_id' => $this->packageBox->id,
            'menu_item_id' => $this->menuItemAyam->id,
            'quantity' => 1,
        ]);
    }

    public function test_can_generate_daily_production_plan_with_bom_calculation(): void
    {
        Sanctum::actingAs($this->user);

        $customer = Customer::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Budi Santoso',
            'phone' => '081234567890',
        ]);

        // Order 1: 50 portions of Paket Nasi Kotak (requires 10 kg chicken, 7.5 kg rice)
        $order = Order::create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $customer->id,
            'order_number' => 'ORD-TEST-001',
            'event_type' => 'Nasi Kotak',
            'delivery_date' => '2026-08-25',
            'delivery_time' => '11:00',
            'delivery_address' => 'Gedung Kesenian Lt 3',
            'status' => 'confirmed',
            'total_amount' => 1750000,
        ]);

        OrderItem::create([
            'tenant_id' => $this->tenant->id,
            'order_id' => $order->id,
            'menu_package_id' => $this->packageBox->id,
            'item_name' => $this->packageBox->name,
            'quantity' => 50,
            'unit_price' => 35000,
            'subtotal_price' => 1750000,
        ]);

        $response = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson('/api/v1/tenant/production/plans/generate', [
                'plan_date' => '2026-08-25',
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.total_orders', 1);
        $response->assertJsonPath('data.total_portions', 50);

        // Verify BOM calculation (50 portions * 0.2 kg chicken = 10 kg)
        $bom = $response->json('data.bom_requirements');
        $this->assertNotEmpty($bom);

        $chickenReq = collect($bom)->firstWhere('raw_material_id', $this->chicken->id);
        $this->assertNotNull($chickenReq);
        $this->assertEquals(10.0, $chickenReq['required_qty']);
        $this->assertEquals('sufficient', $chickenReq['status']);

        // Verify tasks created
        $this->assertDatabaseHas('production_tasks', [
            'tenant_id' => $this->tenant->id,
            'order_id' => $order->id,
            'stage' => 'cooking',
        ]);
    }

    public function test_can_advance_task_stage(): void
    {
        Sanctum::actingAs($this->user);

        $plan = ProductionPlan::create([
            'tenant_id' => $this->tenant->id,
            'plan_code' => 'PROD-20260825-001',
            'plan_date' => '2026-08-25',
            'total_orders' => 1,
            'total_portions' => 20,
            'status' => 'in_progress',
        ]);

        $task = ProductionTask::create([
            'tenant_id' => $this->tenant->id,
            'production_plan_id' => $plan->id,
            'item_name' => 'Ayam Bakar Madu',
            'quantity' => 20,
            'portion_unit' => 'porsi',
            'stage' => 'prep',
        ]);

        $response = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->patchJson("/api/v1/tenant/production/tasks/{$task->id}/stage", [
                'stage' => 'cooking',
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.stage', 'cooking');
        $this->assertDatabaseHas('production_tasks', [
            'id' => $task->id,
            'stage' => 'cooking',
        ]);
    }

    public function test_can_complete_plan_and_auto_deduct_inventory(): void
    {
        Sanctum::actingAs($this->user);

        $customer = Customer::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Siti Nurhaliza',
            'phone' => '081299998888',
        ]);

        $order = Order::create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $customer->id,
            'order_number' => 'ORD-TEST-002',
            'event_type' => 'Prasmanan',
            'delivery_date' => '2026-08-26',
            'delivery_time' => '12:00',
            'delivery_address' => 'Ballroom Hotel Mulia',
            'status' => 'confirmed',
            'total_amount' => 500000,
        ]);

        // 20 portions Ayam Bakar = 4 kg chicken, 3 kg rice
        OrderItem::create([
            'tenant_id' => $this->tenant->id,
            'order_id' => $order->id,
            'menu_item_id' => $this->menuItemAyam->id,
            'item_name' => $this->menuItemAyam->name,
            'quantity' => 20,
            'unit_price' => 25000,
            'subtotal_price' => 500000,
        ]);

        $plan = ProductionPlan::create([
            'tenant_id' => $this->tenant->id,
            'plan_code' => 'PROD-20260826-001',
            'plan_date' => '2026-08-26',
            'total_orders' => 1,
            'total_portions' => 20,
            'status' => 'in_progress',
        ]);

        ProductionTask::create([
            'tenant_id' => $this->tenant->id,
            'production_plan_id' => $plan->id,
            'order_id' => $order->id,
            'menu_item_id' => $this->menuItemAyam->id,
            'item_name' => $this->menuItemAyam->name,
            'quantity' => 20,
            'portion_unit' => 'porsi',
            'stage' => 'cooking',
        ]);

        $initialChickenStock = (float) $this->chicken->current_stock; // 20 kg

        $response = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson("/api/v1/tenant/production/plans/{$plan->id}/complete");

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);

        // Plan should be completed
        $this->assertEquals('completed', $plan->fresh()->status);

        // Associated order should be marked 'ready'
        $this->assertEquals('ready', $order->fresh()->status);

        // Raw material stock should be auto-deducted (20 kg - 4 kg = 16 kg)
        $this->chicken->refresh();
        $this->assertEquals($initialChickenStock - 4.0, (float) $this->chicken->current_stock);

        // StockLedger movement entry recorded
        $this->assertDatabaseHas('stock_ledgers', [
            'tenant_id' => $this->tenant->id,
            'raw_material_id' => $this->chicken->id,
            'type' => 'out',
            'quantity' => 4.0,
            'reference_type' => 'production_plan',
        ]);
    }

    public function test_can_generate_production_label_for_order(): void
    {
        Sanctum::actingAs($this->user);

        $customer = Customer::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Andi Wijaya',
            'phone' => '081377776666',
        ]);

        $order = Order::create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $customer->id,
            'order_number' => 'ORD-LBL-001',
            'event_type' => 'Nasi Kotak',
            'event_name' => 'Seminar Bisnis',
            'delivery_date' => '2026-08-27',
            'delivery_time' => '10:30',
            'delivery_address' => 'Gedung Cyber 2 Lt 15',
            'recipient_name' => 'Pak Andi',
            'recipient_phone' => '081377776666',
            'status' => 'confirmed',
            'total_amount' => 350000,
        ]);

        OrderItem::create([
            'tenant_id' => $this->tenant->id,
            'order_id' => $order->id,
            'menu_package_id' => $this->packageBox->id,
            'item_name' => $this->packageBox->name,
            'quantity' => 10,
            'unit_price' => 35000,
            'subtotal_price' => 350000,
        ]);

        $response = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->getJson("/api/v1/tenant/production/orders/{$order->id}/label");

        $response->assertStatus(200);
        $response->assertJsonPath('data.order_number', 'ORD-LBL-001');
        $response->assertJsonPath('data.event_name', 'Seminar Bisnis');
        $response->assertJsonPath('data.recipient_name', 'Pak Andi');
    }
}
