<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Delivery;
use App\Models\DeliveryArea;
use App\Models\DeliveryProof;
use App\Models\Order;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DeliveryManagementTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $user;
    protected Customer $customer;
    protected DeliveryArea $area;
    protected Order $order;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Delivery Test Tenant',
            'slug' => 'delivery-test',
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
            'name' => 'Admin Logistik',
            'email' => 'logistics@test.com',
            'password' => bcrypt('password'),
            'role_id' => $role->id,
        ]);

        $this->customer = Customer::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Budi Santoso',
            'phone' => '08123456789',
        ]);

        $this->area = DeliveryArea::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Jakarta Selatan - Kebayoran',
            'delivery_fee' => 25000,
        ]);

        $this->order = Order::create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $this->customer->id,
            'delivery_area_id' => $this->area->id,
            'order_number' => 'ORD-DEL-001',
            'event_type' => 'Nasi Box',
            'delivery_date' => now()->toDateString(),
            'delivery_time' => '11:30',
            'delivery_address' => 'Jl. Senopati No. 45, Jakarta Selatan',
            'status' => 'confirmed',
            'total_amount' => 500000,
        ]);
    }

    public function test_can_assign_courier_and_dispatch_order(): void
    {
        Sanctum::actingAs($this->user);

        // 1. Assign Courier
        $assignRes = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson('/api/v1/tenant/deliveries/assign', [
                'order_id' => $this->order->id,
                'courier_name' => 'Pak Joko',
                'courier_phone' => '08198765432',
                'vehicle_type' => 'motorcycle',
                'vehicle_plate_number' => 'B 1234 XYZ',
                'delivery_time_target' => '11:30',
            ]);

        $assignRes->assertStatus(201);
        $assignRes->assertJsonPath('success', true);
        $deliveryId = $assignRes->json('data.id');

        $this->assertDatabaseHas('deliveries', [
            'id' => $deliveryId,
            'tenant_id' => $this->tenant->id,
            'order_id' => $this->order->id,
            'courier_name' => 'Pak Joko',
            'status' => 'assigned',
        ]);

        // 2. Dispatch Delivery (Courier departs)
        $dispatchRes = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->patchJson("/api/v1/tenant/deliveries/{$deliveryId}/status", [
                'status' => 'dispatched',
                'notes' => 'Berangkat dari dapur',
            ]);

        $dispatchRes->assertStatus(200);
        $this->order->refresh();
        $this->assertEquals('delivering', $this->order->status);

        // 3. Submit Proof of Delivery (POD)
        $podRes = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson("/api/v1/tenant/deliveries/{$deliveryId}/proof", [
                'receiver_name' => 'Ibu Siti (Resepsionis)',
                'signature_data' => 'data:image/png;base64,mockSignatureData',
                'photo_url' => 'https://storage.example.com/pod.jpg',
                'latitude' => -6.2297,
                'longitude' => 106.8078,
                'notes' => 'Diterima dalam keadaan baik dan hangat',
            ]);

        $podRes->assertStatus(200);
        $podRes->assertJsonPath('success', true);

        // Verify Delivery is Delivered
        $this->assertDatabaseHas('deliveries', [
            'id' => $deliveryId,
            'status' => 'delivered',
        ]);

        // Verify Order is Completed
        $this->order->refresh();
        $this->assertEquals('completed', $this->order->status);

        // Verify Proof is stored
        $this->assertDatabaseHas('delivery_proofs', [
            'delivery_id' => $deliveryId,
            'order_id' => $this->order->id,
            'receiver_name' => 'Ibu Siti (Resepsionis)',
        ]);
    }

    public function test_can_batch_sync_offline_deliveries(): void
    {
        Sanctum::actingAs($this->user);

        // Create initial assigned delivery
        $delivery = Delivery::create([
            'tenant_id' => $this->tenant->id,
            'order_id' => $this->order->id,
            'delivery_number' => 'DEL-20260820-0099',
            'courier_name' => 'Kurir Offline Driver',
            'status' => 'assigned',
        ]);

        $offlinePayload = [
            'records' => [
                [
                    'delivery_id' => $delivery->id,
                    'receiver_name' => 'Pak Satpam',
                    'signature_data' => 'signature_offline_canvas',
                    'notes' => 'Terkirim saat area tidak ada sinyal internet',
                    'delivered_at' => now()->toISOString(),
                ],
            ],
        ];

        $syncRes = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson('/api/v1/tenant/deliveries/sync-offline', $offlinePayload);

        $syncRes->assertStatus(200);
        $syncRes->assertJsonPath('success', true);
        $syncRes->assertJsonPath('data.synced_count', 1);

        $delivery->refresh();
        $this->assertEquals('delivered', $delivery->status);

        $this->order->refresh();
        $this->assertEquals('completed', $this->order->status);
    }
}
