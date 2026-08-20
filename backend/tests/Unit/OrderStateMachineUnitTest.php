<?php

namespace Tests\Unit;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Tenant;
use App\Services\OrderService;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class OrderStateMachineUnitTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected Customer $customer;
    protected OrderService $orderService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'State Machine Test Catering',
            'slug' => 'sm-catering',
            'is_active' => true,
        ]);

        app(TenantContext::class)->setTenant($this->tenant);
        $this->orderService = app(OrderService::class);

        $this->customer = Customer::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Budi Santoso',
            'phone' => '08123456789',
            'type' => 'individual',
        ]);
    }

    public function test_valid_sequential_order_lifecycle_transitions(): void
    {
        // 1. Create Draft Order
        $order = Order::create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $this->customer->id,
            'order_number' => 'ORD-TEST-001',
            'event_name' => 'Syukuran Kantor',
            'delivery_date' => now()->addDays(2)->format('Y-m-d'),
            'delivery_time' => '11:30',
            'status' => 'draft',
            'total_amount' => 500000,
        ]);

        $this->assertEquals('draft', $order->status);

        // 2. Transition draft -> confirmed
        $order = $this->orderService->transitionStatus($order, 'confirmed', null, 'DP 50% diterima');
        $this->assertEquals('confirmed', $order->status);

        // 3. Transition confirmed -> in_production
        $order = $this->orderService->transitionStatus($order, 'in_production', null, 'Dapur mulai persiapan');
        $this->assertEquals('in_production', $order->status);

        // 4. Transition in_production -> ready
        $order = $this->orderService->transitionStatus($order, 'ready', null, 'Makanan selesai dikemas');
        $this->assertEquals('ready', $order->status);

        // 5. Transition ready -> delivering
        $order = $this->orderService->transitionStatus($order, 'delivering', null, 'Kurir berangkat membawa pesanan');
        $this->assertEquals('delivering', $order->status);

        // 6. Transition delivering -> delivered
        $order = $this->orderService->transitionStatus($order, 'delivered', null, 'Diterima oleh resepsionis');
        $this->assertEquals('delivered', $order->status);

        // 7. Transition delivered -> completed
        $order = $this->orderService->transitionStatus($order, 'completed', null, 'Pelunasan selesai');
        $this->assertEquals('completed', $order->status);
    }

    public function test_cannot_transition_from_terminal_completed_to_draft(): void
    {
        $order = Order::create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $this->customer->id,
            'order_number' => 'ORD-TEST-002',
            'status' => 'completed',
            'delivery_date' => now()->format('Y-m-d'),
            'total_amount' => 300000,
        ]);

        $this->expectException(\InvalidArgumentException::class);
        $this->orderService->transitionStatus($order, 'draft', null, 'Mencoba kembali ke draft');
    }

    public function test_cannot_transition_from_cancelled_to_in_production(): void
    {
        $order = Order::create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $this->customer->id,
            'order_number' => 'ORD-TEST-003',
            'status' => 'cancelled',
            'delivery_date' => now()->format('Y-m-d'),
            'total_amount' => 200000,
        ]);

        $this->expectException(\InvalidArgumentException::class);
        $this->orderService->transitionStatus($order, 'in_production', null, 'Mencoba masak order yang batal');
    }
}
