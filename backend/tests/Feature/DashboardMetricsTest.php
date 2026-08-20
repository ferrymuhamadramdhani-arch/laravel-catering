<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Payment;
use App\Models\RawMaterial;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardMetricsTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $user;
    protected Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Berkah Catering Test',
            'slug' => 'berkah-catering-test',
            'email' => 'catering@berkah.com',
            'is_active' => true,
        ]);

        $this->user = User::factory()->create([
            'current_tenant_id' => $this->tenant->id,
        ]);
        $this->user->tenants()->attach($this->tenant->id, ['role' => 'owner']);

        $this->customer = Customer::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'PT Sumber Makmur',
            'type' => 'corporate',
            'phone' => '08123456789',
            'is_active' => true,
        ]);
    }

    public function test_can_get_dashboard_metrics(): void
    {
        // 1. Create 1 order for today
        $order = Order::create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $this->customer->id,
            'order_number' => 'ORD-TEST-001',
            'event_name' => 'Gathering Kantor',
            'event_type' => 'Nasi Kotak',
            'delivery_date' => now()->toDateString(),
            'delivery_time' => '12:00',
            'subtotal_amount' => 1500000,
            'total_amount' => 1500000,
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'created_by' => $this->user->id,
        ]);

        // 2. Create Raw Material with low stock
        RawMaterial::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Beras Pandan Wangi',
            'sku' => 'MAT-BRS-01',
            'category' => 'Beras & Biji-bijian',
            'unit' => 'kg',
            'current_stock' => 5,
            'minimum_stock' => 20,
            'cost_per_unit' => 14000,
            'is_active' => true,
        ]);

        // 3. Create Invoice & Payment
        $invoice = Invoice::create([
            'tenant_id' => $this->tenant->id,
            'order_id' => $order->id,
            'customer_id' => $this->customer->id,
            'invoice_number' => 'INV-TEST-001',
            'invoice_date' => now()->toDateString(),
            'subtotal_amount' => 1500000,
            'total_amount' => 1500000,
            'paid_amount' => 500000,
            'remaining_amount' => 1000000,
            'status' => 'partially_paid',
            'created_by' => $this->user->id,
        ]);

        Payment::create([
            'tenant_id' => $this->tenant->id,
            'invoice_id' => $invoice->id,
            'order_id' => $order->id,
            'customer_id' => $this->customer->id,
            'payment_number' => 'PAY-TEST-001',
            'payment_date' => now()->toDateString(),
            'amount' => 500000,
            'payment_method' => 'bank_transfer',
            'status' => 'confirmed',
            'received_by' => $this->user->id,
        ]);

        // 4. Request Dashboard Metrics
        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Tenant-ID' => $this->tenant->id])
            ->getJson('/api/v1/tenant/dashboard/metrics');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.revenue_this_month', 500000)
            ->assertJsonPath('data.total_receivables', 1000000)
            ->assertJsonPath('data.active_orders_count', 1)
            ->assertJsonPath('data.today_orders_count', 1)
            ->assertJsonPath('data.low_stock_materials_count', 1);
    }
}
