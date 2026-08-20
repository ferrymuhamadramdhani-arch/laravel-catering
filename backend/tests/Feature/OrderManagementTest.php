<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\MenuPackage;
use App\Models\Order;
use App\Models\RawMaterial;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderManagementTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $user;
    protected Customer $customer;
    protected MenuPackage $package;
    protected MenuItem $menuItem;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Berkah Catering',
            'slug' => 'berkah-catering',
            'email' => 'berkah@catering.id',
            'business_type' => 'catering_box',
            'onboarding_completed' => true,
        ]);

        $this->user = User::create([
            'name' => 'Owner Berkah',
            'email' => 'owner@berkah.id',
            'password' => bcrypt('password'),
            'role' => 'owner',
            'tenant_id' => $this->tenant->id,
            'is_active' => true,
        ]);

        $this->customer = Customer::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'PT. Teknologi Indonesia',
            'type' => 'corporate',
            'phone' => '08123456789',
            'email' => 'hrd@tekno.id',
            'city' => 'Jakarta Selatan',
            'pic_name' => 'Budi Santoso',
        ]);

        $category = MenuCategory::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Olahan Ayam',
            'slug' => 'olahan-ayam',
            'sort_order' => 1,
        ]);

        $this->menuItem = MenuItem::create([
            'tenant_id' => $this->tenant->id,
            'menu_category_id' => $category->id,
            'name' => 'Ayam Bakar Madu',
            'slug' => 'ayam-bakar-madu',
            'selling_price' => 25000,
            'calculated_hpp' => 14000,
            'margin_percentage' => 44,
            'portion_unit' => 'porsi',
            'is_active' => true,
        ]);

        $this->package = MenuPackage::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Paket Nasi Kotak Premium A',
            'slug' => 'paket-nasi-kotak-premium-a',
            'package_type' => 'box',
            'selling_price' => 35000,
            'calculated_hpp' => 18000,
            'margin_percentage' => 48.5,
            'min_order_quantity' => 10,
            'is_active' => true,
        ]);
    }

    public function test_can_create_order_manually(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Tenant-ID' => $this->tenant->id])
            ->postJson('/api/v1/tenant/orders', [
                'customer_id' => $this->customer->id,
                'event_name' => 'Lunch Meeting Q3',
                'event_type' => 'Nasi Kotak',
                'delivery_date' => '2026-08-25',
                'delivery_time' => '11:30',
                'delivery_fee' => 25000,
                'down_payment_amount' => 500000,
                'status' => 'confirmed',
                'items' => [
                    [
                        'item_type' => 'menu_package',
                        'menu_package_id' => $this->package->id,
                        'quantity' => 50,
                        'unit_price' => 35000,
                        'notes' => '10 box sambal dipisah',
                    ],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.payment_status', 'partially_paid');

        $this->assertDatabaseHas('orders', [
            'tenant_id' => $this->tenant->id,
            'customer_id' => $this->customer->id,
            'status' => 'confirmed',
            'subtotal_amount' => 1750000, // 50 * 35000
            'total_amount' => 1775000, // 1750000 + 25000
        ]);

        $this->assertDatabaseHas('order_items', [
            'item_name' => 'Paket Nasi Kotak Premium A',
            'quantity' => 50,
        ]);

        $this->assertDatabaseHas('order_status_histories', [
            'to_status' => 'confirmed',
        ]);
    }

    public function test_can_transition_order_status_lifecycle(): void
    {
        $order = Order::create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $this->customer->id,
            'order_number' => 'ORD-20260825-0001',
            'delivery_date' => '2026-08-25',
            'subtotal_amount' => 350000,
            'total_amount' => 350000,
            'payment_status' => 'down_payment',
            'status' => 'confirmed',
        ]);

        // Transition from confirmed -> in_production
        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Tenant-ID' => $this->tenant->id])
            ->patchJson("/api/v1/tenant/orders/{$order->id}/status", [
                'status' => 'in_production',
                'notes' => 'Koki mulai memasak di dapur',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'in_production');

        $this->assertDatabaseHas('order_status_histories', [
            'order_id' => $order->id,
            'from_status' => 'confirmed',
            'to_status' => 'in_production',
            'notes' => 'Koki mulai memasak di dapur',
        ]);
    }

    public function test_can_fetch_calendar_aggregated_orders(): void
    {
        Order::create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $this->customer->id,
            'order_number' => 'ORD-20260825-0001',
            'delivery_date' => '2026-08-25',
            'delivery_time' => '12:00',
            'subtotal_amount' => 500000,
            'total_amount' => 500000,
            'status' => 'confirmed',
        ]);

        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Tenant-ID' => $this->tenant->id])
            ->getJson('/api/v1/tenant/orders/calendar?month=8&year=2026');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['month', 'year', 'days']]);
    }
}
