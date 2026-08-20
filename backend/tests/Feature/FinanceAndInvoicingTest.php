<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceAndInvoicingTest extends TestCase
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
            'name' => 'Berkah Catering Test',
            'slug' => 'berkah-catering-test',
            'phone' => '081234567890',
            'email' => 'finance@berkah.test',
            'is_active' => true,
        ]);

        $this->user = User::factory()->create([
            'current_tenant_id' => $this->tenant->id,
        ]);

        $this->customer = Customer::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'PT. Inovasi Gemilang',
            'type' => 'corporate',
            'phone' => '0811998877',
            'email' => 'finance@inovasi.test',
            'address' => 'Jl. Sudirman Kav 1',
        ]);

        $this->order = Order::create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $this->customer->id,
            'order_number' => 'ORD-TEST-001',
            'event_name' => 'Lunch Gathering',
            'event_type' => 'Nasi Kotak',
            'delivery_date' => now()->addDays(2)->toDateString(),
            'subtotal_amount' => 1000000,
            'delivery_fee' => 50000,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'total_amount' => 1050000,
            'total_hpp' => 600000,
            'down_payment_amount' => 0,
            'payment_status' => 'unpaid',
            'status' => 'confirmed',
            'created_by' => $this->user->id,
        ]);
    }

    public function test_can_create_invoice_for_order(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Tenant-ID' => $this->tenant->id])
            ->postJson('/api/v1/tenant/invoices', [
                'order_id' => $this->order->id,
                'invoice_type' => 'full',
                'notes' => 'Tagihan catering lunch gathering kantor',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_amount', '1050000.00')
            ->assertJsonPath('data.remaining_amount', '1050000.00')
            ->assertJsonPath('data.status', 'unpaid');

        $this->assertDatabaseHas('invoices', [
            'tenant_id' => $this->tenant->id,
            'order_id' => $this->order->id,
            'status' => 'unpaid',
        ]);
    }

    public function test_can_record_down_payment_and_partial_paid_status(): void
    {
        // 1. Create Invoice
        $invoiceResponse = $this->actingAs($this->user)
            ->withHeaders(['X-Tenant-ID' => $this->tenant->id])
            ->postJson('/api/v1/tenant/invoices', [
                'order_id' => $this->order->id,
                'invoice_type' => 'full',
            ]);

        $invoiceId = $invoiceResponse->json('data.id');

        // 2. Record Down Payment of Rp 500.000
        $paymentResponse = $this->actingAs($this->user)
            ->withHeaders(['X-Tenant-ID' => $this->tenant->id])
            ->postJson("/api/v1/tenant/invoices/{$invoiceId}/payments", [
                'amount' => 500000,
                'payment_date' => now()->toDateString(),
                'payment_method' => 'bank_transfer',
                'destination_bank_account' => 'BCA 8881234567 - PT Berkah',
                'reference_number' => 'TRX-BCA-987654',
                'notes' => 'Pembayaran Uang Muka (DP) 50%',
            ]);

        $paymentResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.amount', '500000.00');

        // 3. Check Invoice Status Updated to partially_paid
        $invoice = Invoice::find($invoiceId);
        $this->assertEquals('partially_paid', $invoice->status);
        $this->assertEquals(500000, $invoice->paid_amount);
        $this->assertEquals(550000, $invoice->remaining_amount);

        // 4. Check Order Payment Status Updated
        $this->order->refresh();
        $this->assertEquals('partially_paid', $this->order->payment_status);
        $this->assertEquals(500000, $this->order->down_payment_amount);
    }

    public function test_can_record_full_payment_settlement(): void
    {
        // 1. Create Invoice
        $invoiceResponse = $this->actingAs($this->user)
            ->withHeaders(['X-Tenant-ID' => $this->tenant->id])
            ->postJson('/api/v1/tenant/invoices', [
                'order_id' => $this->order->id,
                'invoice_type' => 'full',
            ]);

        $invoiceId = $invoiceResponse->json('data.id');

        // 2. Pay 1st Installment: Rp 500.000
        $this->actingAs($this->user)
            ->withHeaders(['X-Tenant-ID' => $this->tenant->id])
            ->postJson("/api/v1/tenant/invoices/{$invoiceId}/payments", [
                'amount' => 500000,
                'payment_method' => 'bank_transfer',
            ]);

        // 3. Pay Remaining: Rp 550.000
        $this->actingAs($this->user)
            ->withHeaders(['X-Tenant-ID' => $this->tenant->id])
            ->postJson("/api/v1/tenant/invoices/{$invoiceId}/payments", [
                'amount' => 550000,
                'payment_method' => 'cash',
                'notes' => 'Pelunasan saat pengantaran',
            ]);

        // 4. Check Invoice Status is paid
        $invoice = Invoice::find($invoiceId);
        $this->assertEquals('paid', $invoice->status);
        $this->assertEquals(1050000, $invoice->paid_amount);
        $this->assertEquals(0, $invoice->remaining_amount);

        // 5. Check Order is paid
        $this->order->refresh();
        $this->assertEquals('paid', $this->order->payment_status);
    }

    public function test_can_get_finance_summary_metrics(): void
    {
        // Create 1 unpaid invoice
        $this->actingAs($this->user)
            ->withHeaders(['X-Tenant-ID' => $this->tenant->id])
            ->postJson('/api/v1/tenant/invoices', [
                'order_id' => $this->order->id,
            ]);

        $summaryResponse = $this->actingAs($this->user)
            ->withHeaders(['X-Tenant-ID' => $this->tenant->id])
            ->getJson('/api/v1/tenant/finance/summary');

        $summaryResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_invoices_count', 1)
            ->assertJsonPath('data.unpaid_count', 1)
            ->assertJsonPath('data.total_receivables', 1050000);
    }

    public function test_can_get_invoices_list_with_relations(): void
    {
        $this->actingAs($this->user)
            ->withHeaders(['X-Tenant-ID' => $this->tenant->id])
            ->postJson('/api/v1/tenant/invoices', [
                'order_id' => $this->order->id,
            ]);

        $response = $this->actingAs($this->user)
            ->withHeaders(['X-Tenant-ID' => $this->tenant->id])
            ->getJson('/api/v1/tenant/invoices');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data');
    }
}
