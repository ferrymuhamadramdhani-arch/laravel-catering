<?php

namespace Tests\Feature;

use App\Models\Courier;
use App\Models\Customer;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CourierAndFleetManagementTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Catering Berkah Ekspedisi',
            'slug' => 'berkah-ekspedisi',
            'is_active' => true,
        ]);

        $this->user = User::create([
            'name' => 'Dispatch Lead',
            'email' => 'dispatch@berkahekspedisi.id',
            'password' => bcrypt('password'),
            'current_tenant_id' => $this->tenant->id,
        ]);

        TenantUser::create([
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->user->id,
            'role' => 'owner',
            'is_active' => true,
        ]);

        app(TenantContext::class)->setTenant($this->tenant);
        Sanctum::actingAs($this->user);
    }

    public function test_courier_crud_endpoints(): void
    {
        // 1. Create Courier
        $resCreate = $this->postJson('/api/v1/tenant/couriers', [
            'name' => 'Rahmat Hidayat',
            'phone' => '081234567890',
            'license_type' => 'SIM C',
            'license_number' => '1234-5678-9012',
            'vehicle_type_preference' => 'motorcycle',
            'notes' => 'Driver area Jakarta Selatan',
        ]);

        $resCreate->assertStatus(201);
        $courierId = $resCreate->json('data.id');
        $this->assertDatabaseHas('couriers', [
            'id' => $courierId,
            'name' => 'Rahmat Hidayat',
            'tenant_id' => $this->tenant->id,
        ]);

        // 2. List Couriers
        $resList = $this->getJson('/api/v1/tenant/couriers');
        $resList->assertStatus(200);
        $this->assertCount(1, $resList->json('data'));

        // 3. Update Courier
        $resUpdate = $this->putJson("/api/v1/tenant/couriers/{$courierId}", [
            'name' => 'Rahmat Hidayat Senior',
            'phone' => '081299998888',
        ]);
        $resUpdate->assertStatus(200);
        $this->assertEquals('Rahmat Hidayat Senior', $resUpdate->json('data.name'));

        // 4. Delete Courier
        $resDelete = $this->deleteJson("/api/v1/tenant/couriers/{$courierId}");
        $resDelete->assertStatus(200);
        $this->assertDatabaseMissing('couriers', ['id' => $courierId]);
    }

    public function test_vehicle_crud_endpoints(): void
    {
        // 1. Create Vehicle
        $resCreate = $this->postJson('/api/v1/tenant/vehicles', [
            'name' => 'Daihatsu GranMax Van 01',
            'vehicle_type' => 'van',
            'license_plate' => 'b 1234 abc',
            'max_capacity_box' => 250,
            'condition_status' => 'good',
        ]);

        $resCreate->assertStatus(201);
        $vehicleId = $resCreate->json('data.id');
        $this->assertDatabaseHas('vehicles', [
            'id' => $vehicleId,
            'license_plate' => 'B 1234 ABC',
            'tenant_id' => $this->tenant->id,
        ]);

        // 2. List Vehicles
        $resList = $this->getJson('/api/v1/tenant/vehicles');
        $resList->assertStatus(200);
        $this->assertCount(1, $resList->json('data'));

        // 3. Update Vehicle Condition
        $resUpdate = $this->putJson("/api/v1/tenant/vehicles/{$vehicleId}", [
            'condition_status' => 'maintenance',
            'notes' => 'Servis rem dan oli berkala',
        ]);
        $resUpdate->assertStatus(200);
        $this->assertEquals('maintenance', $resUpdate->json('data.condition_status'));

        // 4. Delete Vehicle
        $resDelete = $this->deleteJson("/api/v1/tenant/vehicles/{$vehicleId}");
        $resDelete->assertStatus(200);
        $this->assertDatabaseMissing('vehicles', ['id' => $vehicleId]);
    }

    public function test_live_availability_checker_for_couriers_and_fleet(): void
    {
        // 1. Create 2 Couriers
        $courier1 = Courier::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Driver A (Busy)',
            'phone' => '0811111111',
            'license_type' => 'SIM C',
            'is_active' => true,
        ]);

        $courier2 = Courier::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Driver B (Free)',
            'phone' => '0822222222',
            'license_type' => 'SIM A',
            'is_active' => true,
        ]);

        // 2. Create 2 Vehicles
        $van1 = Vehicle::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'GranMax Van 01 (Busy)',
            'vehicle_type' => 'van',
            'license_plate' => 'B 1111 VAN',
            'max_capacity_box' => 200,
            'is_active' => true,
        ]);

        $van2 = Vehicle::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'GranMax Van 02 (Maintenance)',
            'vehicle_type' => 'van',
            'license_plate' => 'B 2222 VAN',
            'max_capacity_box' => 200,
            'condition_status' => 'maintenance',
            'is_active' => true,
        ]);

        // 3. Create Order & Assign Courier 1 + Van 1 on today's date
        $customer = Customer::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'PT Mandiri Jaya',
            'phone' => '0812999888',
        ]);

        $todayStr = now()->format('Y-m-d');
        $order = Order::create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $customer->id,
            'order_number' => 'ORD-DISPATCH-001',
            'delivery_date' => $todayStr,
            'delivery_time' => '11:30',
            'status' => 'confirmed',
            'total_amount' => 500000,
        ]);

        Delivery::create([
            'tenant_id' => $this->tenant->id,
            'order_id' => $order->id,
            'delivery_number' => 'DEL-20260820-0001',
            'courier_id' => $courier1->id,
            'vehicle_id' => $van1->id,
            'courier_name' => $courier1->name,
            'courier_phone' => $courier1->phone,
            'vehicle_type' => $van1->vehicle_type,
            'vehicle_plate_number' => $van1->license_plate,
            'delivery_time_target' => '11:30',
            'status' => 'dispatched',
        ]);

        // 4. Query Available Resources for Today
        $res = $this->getJson("/api/v1/tenant/deliveries/available-resources?date={$todayStr}");
        $res->assertStatus(200);

        $couriersData = collect($res->json('data.couriers'));
        $vehiclesData = collect($res->json('data.vehicles'));

        // Courier 1 must be busy, Courier 2 must be available
        $c1 = $couriersData->firstWhere('id', $courier1->id);
        $this->assertFalse($c1['is_available']);
        $this->assertEquals('Sedang Mengantar', $c1['status_label']);

        $c2 = $couriersData->firstWhere('id', $courier2->id);
        $this->assertTrue($c2['is_available']);
        $this->assertEquals('Tersedia', $c2['status_label']);

        // Van 1 must be busy, Van 2 must be in maintenance
        $v1 = $vehiclesData->firstWhere('id', $van1->id);
        $this->assertFalse($v1['is_available']);
        $this->assertEquals('Sedang Digunakan', $v1['status_label']);

        $v2 = $vehiclesData->firstWhere('id', $van2->id);
        $this->assertFalse($v2['is_available']);
        $this->assertEquals('Dalam Perbaikan', $v2['status_label']);
    }
}
