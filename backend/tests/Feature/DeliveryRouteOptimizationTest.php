<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DeliveryRouteOptimizationTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $admin;
    protected User $courier;
    protected Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Royal Catering Logistik',
            'slug' => 'royal-catering',
            'is_active' => true,
        ]);

        $adminRole = Role::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Logistics Manager',
            'slug' => 'logistics-mgr',
            'permissions' => ['*'],
        ]);

        $courierRole = Role::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Kurir Lapangan',
            'slug' => 'courier',
            'permissions' => ['deliveries.view', 'deliveries.update'],
        ]);

        $this->admin = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dispatcher Admin',
            'email' => 'dispatcher@royal.id',
            'password' => bcrypt('password'),
            'role_id' => $adminRole->id,
        ]);

        $this->courier = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Budi Kurir Gesit',
            'email' => 'budi.kurir@royal.id',
            'password' => bcrypt('password'),
            'role_id' => $courierRole->id,
        ]);

        $this->customer = Customer::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'PT Mega Sukses Bersama',
            'phone' => '081234567890',
            'email' => 'procurement@megasukses.com',
            'address' => 'Gedung Wisma 46, Lantai 15, Sudirman, Jakarta Pusat',
        ]);
    }

    public function test_can_optimize_daily_delivery_route_and_generate_maps_url(): void
    {
        Sanctum::actingAs($this->admin);

        $today = now()->toDateString();

        // 1. Create 3 test orders and deliveries for today
        $locations = [
            ['Sudirman Central Business District, Jakarta', '10:00:00'],
            ['Kuningan Office Tower, Jakarta Selatan', '11:30:00'],
            ['Kelapa Gading Boulevard No. 88, Jakarta Utara', '13:00:00'],
        ];

        foreach ($locations as $idx => $loc) {
            $order = Order::create([
                'tenant_id' => $this->tenant->id,
                'customer_id' => $this->customer->id,
                'order_number' => 'ORD-TEST-' . ($idx + 1),
                'order_type' => 'catering_box',
                'delivery_date' => $today,
                'delivery_time' => $loc[1],
                'delivery_address' => $loc[0],
                'total_amount' => 1500000,
                'status' => 'confirmed',
            ]);

            Delivery::create([
                'tenant_id' => $this->tenant->id,
                'order_id' => $order->id,
                'delivery_number' => 'DEL-TEST-' . ($idx + 1),
                'delivery_date' => $today,
                'delivery_time_target' => $loc[1],
                'destination_address' => $loc[0],
                'recipient_name' => 'Penerima ' . ($idx + 1),
                'recipient_phone' => '08129988776' . $idx,
                'courier_name' => 'Belum Ditugaskan',
                'status' => 'pending',
            ]);
        }

        // 2. Request route optimization
        $response = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->getJson("/api/v1/tenant/deliveries/routes/optimize?date={$today}");

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.total_stops', 3);
        $this->assertGreaterThan(0, $response->json('data.total_estimated_distance_km'));
        $this->assertGreaterThan(0, $response->json('data.total_estimated_duration_minutes'));

        $mapsUrl = $response->json('data.google_maps_directions_url');
        $this->assertStringContainsString('google.com/maps/dir', $mapsUrl);
        $this->assertStringContainsString('origin=', $mapsUrl);
        $this->assertStringContainsString('destination=', $mapsUrl);
    }

    public function test_can_batch_assign_deliveries_to_courier(): void
    {
        Sanctum::actingAs($this->admin);

        $today = now()->toDateString();

        $order = Order::create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $this->customer->id,
            'order_number' => 'ORD-BATCH-1',
            'order_type' => 'buffet',
            'delivery_date' => $today,
            'delivery_time' => '12:00:00',
            'delivery_address' => 'Plaza Indonesia, Jakarta Pusat',
            'total_amount' => 5000000,
            'status' => 'confirmed',
        ]);

        $delivery1 = Delivery::create([
            'tenant_id' => $this->tenant->id,
            'order_id' => $order->id,
            'delivery_number' => 'DEL-BATCH-1',
            'delivery_date' => $today,
            'delivery_time_target' => '12:00:00',
            'destination_address' => 'Plaza Indonesia, Jakarta Pusat',
            'courier_name' => 'Belum Ditugaskan',
            'status' => 'pending',
        ]);

        $delivery2 = Delivery::create([
            'tenant_id' => $this->tenant->id,
            'order_id' => $order->id,
            'delivery_number' => 'DEL-BATCH-2',
            'delivery_date' => $today,
            'delivery_time_target' => '13:30:00',
            'destination_address' => 'Grand Indonesia, Jakarta Pusat',
            'courier_name' => 'Belum Ditugaskan',
            'status' => 'pending',
        ]);

        $response = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson('/api/v1/tenant/deliveries/routes/batch-assign', [
                'delivery_ids' => [$delivery1->id, $delivery2->id],
                'courier_user_id' => $this->courier->id,
                'vehicle_type' => 'van',
                'vehicle_license_plate' => 'B 1234 GOG',
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('deliveries', [
            'id' => $delivery1->id,
            'courier_name' => $this->courier->name,
            'vehicle_type' => 'van',
            'vehicle_plate_number' => 'B 1234 GOG',
            'status' => 'assigned',
        ]);

        // 3. Fetch courier itinerary
        $itineraryRes = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->getJson("/api/v1/tenant/deliveries/routes/courier/{$this->courier->id}?date={$today}");

        $itineraryRes->assertStatus(200);
        $itineraryRes->assertJsonPath('data.total_stops', 2);
    }
}
