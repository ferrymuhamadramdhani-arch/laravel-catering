<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentGatewayIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $user;
    protected Customer $customer;
    protected Order $order;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Berkah Catering Nusantara',
            'slug' => 'berkah-catering',
            'phone' => '081234567890',
            'email' => 'kontak@berkah.com',
            'is_active' => true,
        ]);

        $this->user = User::factory()->create([
            'current_tenant_id' => $this->tenant->id,
        ]);
        $this->user->tenants()->attach($this->tenant->id, ['role' => 'owner']);

        $this->customer = Customer::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Pak Hendra Pratama',
            'phone' => '081399887766',
            'is_active' => true,
        ]);

        $this->order = Order::create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $this->customer->id,
            'order_number' => 'ORD-202608-9901',
            'tracking_code' => 'TRK-9901-TEST',
            'event_name' => 'Syukuran Kantor',
            'event_type' => 'Nasi Kotak',
            'delivery_date' => now()->addDays(2)->toDateString(),
            'delivery_time' => '12:00',
            'subtotal_amount' => 2000000,
            'total_amount' => 2000000,
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'created_by' => $this->user->id,
        ]);

        Invoice::create([
            'tenant_id' => $this->tenant->id,
            'order_id' => $this->order->id,
            'customer_id' => $this->customer->id,
            'invoice_number' => 'INV/202608/9901',
            'invoice_date' => now()->toDateString(),
            'subtotal_amount' => 2000000,
            'total_amount' => 2000000,
            'paid_amount' => 0,
            'remaining_amount' => 2000000,
            'status' => 'unpaid',
            'created_by' => $this->user->id,
        ]);
    }

    public function test_can_create_payment_gateway_token(): void
    {
        $response = $this->postJson('/api/v1/public/payment-gateway/create-token', [
            'order_number' => $this->order->order_number,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'order_id',
                    'order_number',
                    'snap_token',
                    'payment_methods' => ['qris', 'virtual_accounts'],
                ],
            ]);
    }

    public function test_can_process_payment_webhook_settlement(): void
    {
        $webhookPayload = [
            'order_id' => $this->order->order_number,
            'transaction_status' => 'settlement',
            'fraud_status' => 'accept',
            'gross_amount' => 2000000,
            'payment_type' => 'qris',
            'transaction_id' => 'TXN-MIDTRANS-12345',
        ];

        $response = $this->postJson('/api/v1/public/webhooks/payment-gateway', $webhookPayload);

        $response->assertStatus(200)
            ->assertJsonPath('data.success', true)
            ->assertJsonPath('data.invoice_status', 'paid');

        $this->order->refresh();
        $this->assertEquals('paid', $this->order->payment_status);
        $this->assertEquals(2000000, $this->order->down_payment_amount);
    }

    public function test_can_simulate_payment_online(): void
    {
        $response = $this->postJson('/api/v1/public/payment-gateway/simulate-pay', [
            'order_number' => $this->order->order_number,
            'amount' => 1000000, // DP 50%
            'payment_type' => 'bank_transfer',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.invoice_status', 'partially_paid');

        $this->order->refresh();
        $this->assertEquals('partially_paid', $this->order->payment_status);
    }
}
