<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\MenuRecipeBom;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\RawMaterial;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AnalyticsAndForecastingTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $user;
    protected Customer $customerA;
    protected Customer $customerB;
    protected MenuItem $menuItem;
    protected RawMaterial $beef;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Royal Sultan Catering',
            'slug' => 'royal-sultan',
            'is_active' => true,
        ]);

        $role = Role::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Owner Admin',
            'slug' => 'owner-admin',
            'permissions' => ['*'],
        ]);

        $this->user = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Sultan Owner',
            'email' => 'owner@royalsultan.com',
            'password' => bcrypt('password'),
            'role_id' => $role->id,
        ]);

        $this->customerA = Customer::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'PT Bank Mandiri Corporate',
            'company_name' => 'PT Bank Mandiri (Persero) Tbk',
            'phone' => '081299887766',
        ]);

        $this->customerB = Customer::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Ibu Siti Khadijah',
            'phone' => '081344556677',
        ]);

        $category = MenuCategory::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Prasmanan Nusantara',
            'slug' => 'prasmanan-nusantara',
        ]);

        $this->beef = RawMaterial::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Daging Sapi Tenderloin',
            'category' => 'Daging & Unggas',
            'unit' => 'kg',
            'default_purchase_price' => 120000,
            'current_stock' => 50,
        ]);

        $this->menuItem = MenuItem::create([
            'tenant_id' => $this->tenant->id,
            'menu_category_id' => $category->id,
            'name' => 'Rendang Daging Sapi Spesial',
            'slug' => 'rendang-daging-sapi-spesial',
            'selling_price' => 35000,
            'portion_unit' => 'porsi',
            'is_active' => true,
        ]);

        MenuRecipeBom::create([
            'tenant_id' => $this->tenant->id,
            'menu_item_id' => $this->menuItem->id,
            'raw_material_id' => $this->beef->id,
            'quantity' => 0.15, // 0.15 kg per portion
            'cost_per_unit' => 120000,
            'subtotal_cost' => 18000, // 0.15 * 120,000 = 18,000 HPP
        ]);

        // Create Order 1 for Customer A (100 portions = Rp 3.500.000, HPP = 1.800.000)
        $order1 = Order::create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $this->customerA->id,
            'order_number' => 'ORD-TEST-001',
            'delivery_date' => now()->subDays(3)->toDateString(),
            'status' => 'completed',
            'total_amount' => 3500000,
        ]);

        OrderItem::create([
            'tenant_id' => $this->tenant->id,
            'order_id' => $order1->id,
            'menu_item_id' => $this->menuItem->id,
            'item_name' => 'Rendang Daging Sapi Spesial',
            'quantity' => 100,
            'unit_price' => 35000,
            'subtotal_price' => 3500000,
        ]);

        $invoice1 = \App\Models\Invoice::create([
            'tenant_id' => $this->tenant->id,
            'order_id' => $order1->id,
            'customer_id' => $this->customerA->id,
            'invoice_number' => 'INV-TEST-001',
            'invoice_date' => now()->toDateString(),
            'total_amount' => 3500000,
            'paid_amount' => 3500000,
            'remaining_amount' => 0,
            'status' => 'paid',
            'due_date' => now()->toDateString(),
        ]);

        Payment::create([
            'tenant_id' => $this->tenant->id,
            'payment_number' => 'PAY-TEST-001',
            'order_id' => $order1->id,
            'invoice_id' => $invoice1->id,
            'customer_id' => $this->customerA->id,
            'payment_date' => now()->toDateString(),
            'amount' => 3500000,
            'payment_method' => 'bank_transfer',
            'status' => 'confirmed',
        ]);

        // Create Order 2 for Customer A (Repeat Order: 50 portions = Rp 1.750.000, HPP = 900.000)
        $order2 = Order::create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $this->customerA->id,
            'order_number' => 'ORD-TEST-002',
            'delivery_date' => now()->subDay()->toDateString(),
            'status' => 'confirmed',
            'total_amount' => 1750000,
        ]);

        OrderItem::create([
            'tenant_id' => $this->tenant->id,
            'order_id' => $order2->id,
            'menu_item_id' => $this->menuItem->id,
            'item_name' => 'Rendang Daging Sapi Spesial',
            'quantity' => 50,
            'unit_price' => 35000,
            'subtotal_price' => 1750000,
        ]);

        // Create Order 3 for Customer B (Single Order: 20 portions = Rp 700.000)
        $order3 = Order::create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $this->customerB->id,
            'order_number' => 'ORD-TEST-003',
            'delivery_date' => now()->toDateString(),
            'status' => 'ready',
            'total_amount' => 700000,
        ]);

        OrderItem::create([
            'tenant_id' => $this->tenant->id,
            'order_id' => $order3->id,
            'menu_item_id' => $this->menuItem->id,
            'item_name' => 'Rendang Daging Sapi Spesial',
            'quantity' => 20,
            'unit_price' => 35000,
            'subtotal_price' => 700000,
        ]);
    }

    public function test_can_fetch_analytics_overview_with_margins_and_trends(): void
    {
        Sanctum::actingAs($this->user);

        $res = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->getJson('/api/v1/tenant/analytics/overview');

        $res->assertStatus(200);
        $res->assertJsonPath('success', true);

        // Total orders: 3 orders
        $res->assertJsonPath('data.total_orders', 3);
        // Total gross revenue: 3.5m + 1.75m + 0.7m = 5.95m
        $res->assertJsonPath('data.gross_revenue', 5950000);
        // Total HPP: (100 + 50 + 20) * 18,000 = 170 * 18,000 = 3.060.000
        $res->assertJsonPath('data.total_hpp', 3060000);
        // Gross Profit: 5.95m - 3.06m = 2.890.000
        $res->assertJsonPath('data.gross_profit', 2890000);
        // Paid revenue: 3.5m
        $res->assertJsonPath('data.paid_revenue', 3500000);
    }

    public function test_can_fetch_menu_performance_ranking(): void
    {
        Sanctum::actingAs($this->user);

        $res = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->getJson('/api/v1/tenant/analytics/menus');

        $res->assertStatus(200);
        $res->assertJsonPath('success', true);
        $topMenus = $res->json('data.top_menus');

        $this->assertNotEmpty($topMenus);
        $this->assertEquals('Rendang Daging Sapi Spesial', $topMenus[0]['name']);
        $this->assertEquals(170, $topMenus[0]['total_portions_sold']);
        $this->assertEquals(5950000, $topMenus[0]['total_revenue']);
    }

    public function test_can_fetch_customer_retention_and_vip_clients(): void
    {
        Sanctum::actingAs($this->user);

        $res = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->getJson('/api/v1/tenant/analytics/customers');

        $res->assertStatus(200);
        $res->assertJsonPath('success', true);

        // Total customers: 2
        $res->assertJsonPath('data.total_customers', 2);
        // Customer A has 2 orders (Repeat), Customer B has 1 order (Single)
        $res->assertJsonPath('data.repeat_customers', 1);
        $res->assertJsonPath('data.single_order_customers', 1);
        $res->assertJsonPath('data.repeat_order_rate_percentage', 50);

        $vipClients = $res->json('data.top_vip_clients');
        $this->assertEquals('PT Bank Mandiri Corporate', $vipClients[0]['name']);
        $this->assertEquals(5250000, $vipClients[0]['total_spend']);
    }

    public function test_can_calculate_demand_forecasting(): void
    {
        Sanctum::actingAs($this->user);

        $res = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->getJson('/api/v1/tenant/analytics/forecasting?days=14');

        $res->assertStatus(200);
        $res->assertJsonPath('success', true);
        $res->assertJsonPath('data.forecast_period_days', 14);

        $timeline = $res->json('data.daily_timeline');
        $this->assertCount(14, $timeline);

        $materials = $res->json('data.forecasted_materials');
        $this->assertNotEmpty($materials);
        $this->assertEquals('Daging Sapi Tenderloin', $materials[0]['material_name']);
    }

    public function test_can_fetch_and_export_financial_p_and_l_report(): void
    {
        Sanctum::actingAs($this->user);

        // 1. JSON Report
        $reportRes = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->getJson('/api/v1/tenant/analytics/financial-report');

        $reportRes->assertStatus(200);
        $reportRes->assertJsonPath('success', true);
        $reportRes->assertJsonPath('data.revenue.gross_sales', 5950000);
        $reportRes->assertJsonPath('data.cost_of_goods_sold.total_cogs', 3060000);

        // 2. CSV Stream Export
        $exportRes = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->get('/api/v1/tenant/analytics/export');

        $exportRes->assertStatus(200);
        $exportRes->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }
}
