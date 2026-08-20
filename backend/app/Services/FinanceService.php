<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class FinanceService
{
    /**
     * Generate unique Invoice Number per Tenant: INV/YYYYMM/0001
     */
    public function generateInvoiceNumber(int $tenantId): string
    {
        $prefix = 'INV/' . Carbon::now()->format('Ym') . '/';
        $latest = Invoice::where('tenant_id', $tenantId)
            ->where('invoice_number', 'like', $prefix . '%')
            ->orderBy('id', 'desc')
            ->first();

        $nextSeq = 1;
        if ($latest) {
            $parts = explode('/', $latest->invoice_number);
            if (count($parts) >= 3) {
                $nextSeq = intval(end($parts)) + 1;
            }
        }

        return $prefix . str_pad($nextSeq, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Generate unique Payment Number per Tenant: PAY/YYYYMM/0001
     */
    public function generatePaymentNumber(int $tenantId): string
    {
        $prefix = 'PAY/' . Carbon::now()->format('Ym') . '/';
        $latest = Payment::where('tenant_id', $tenantId)
            ->where('payment_number', 'like', $prefix . '%')
            ->orderBy('id', 'desc')
            ->first();

        $nextSeq = 1;
        if ($latest) {
            $parts = explode('/', $latest->payment_number);
            if (count($parts) >= 3) {
                $nextSeq = intval(end($parts)) + 1;
            }
        }

        return $prefix . str_pad($nextSeq, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Create Invoice from Order
     */
    public function createInvoiceForOrder(Order $order, array $data = [], ?User $creator = null): Invoice
    {
        return DB::transaction(function () use ($order, $data, $creator) {
            $invoiceNumber = $data['invoice_number'] ?? $this->generateInvoiceNumber($order->tenant_id);
            $invoiceDate = $data['invoice_date'] ?? Carbon::now()->toDateString();
            $dueDate = $data['due_date'] ?? Carbon::parse($order->delivery_date)->toDateString();
            $type = $data['invoice_type'] ?? 'full';

            $subtotal = (float) $order->subtotal_amount;
            $deliveryFee = (float) $order->delivery_fee;
            $discount = (float) ($data['discount_amount'] ?? $order->discount_amount ?? 0);
            $tax = (float) ($data['tax_amount'] ?? $order->tax_amount ?? 0);
            $total = (float) ($data['total_amount'] ?? $order->total_amount ?? ($subtotal + $deliveryFee - $discount + $tax));

            $creatorId = $creator ? $creator->id : ($order->created_by ?? null);

            // Custom amount if down_payment or custom specified
            if ($type === 'down_payment' && isset($data['total_amount']) && $data['total_amount'] > 0) {
                $total = (float) $data['total_amount'];
                $subtotal = $total;
                $deliveryFee = 0;
                $discount = 0;
                $tax = 0;
            }

            $invoice = Invoice::create([
                'tenant_id' => $order->tenant_id,
                'order_id' => $order->id,
                'customer_id' => $order->customer_id,
                'invoice_number' => $invoiceNumber,
                'invoice_date' => $invoiceDate,
                'due_date' => $dueDate,
                'invoice_type' => $type,
                'subtotal_amount' => $subtotal,
                'delivery_fee' => $deliveryFee,
                'discount_amount' => $discount,
                'tax_amount' => $tax,
                'total_amount' => $total,
                'paid_amount' => 0,
                'remaining_amount' => $total,
                'status' => 'unpaid',
                'notes' => $data['notes'] ?? $order->notes,
                'terms_and_conditions' => $data['terms_and_conditions'] ?? '1. Pembayaran ditransfer ke rekening resmi katering yang tertera di faktur ini.\n2. Harap cantumkan Nomor Invoice saat melakukan transfer pembayaran.',
                'created_by' => $creatorId,
            ]);

            return $invoice;
        });
    }

    /**
     * Record payment against an Invoice
     */
    public function recordPayment(Invoice $invoice, array $data, User $receiver): Payment
    {
        return DB::transaction(function () use ($invoice, $data, $receiver) {
            // Lock invoice row for update to prevent concurrent duplicate payments
            $invoice = Invoice::where('id', $invoice->id)->lockForUpdate()->firstOrFail();

            $totalPaidExisting = (float) Payment::where('invoice_id', $invoice->id)
                ->where('status', 'confirmed')
                ->sum('amount');

            $invoiceTotal = (float) $invoice->total_amount;
            $currentRemaining = max(0, $invoiceTotal - $totalPaidExisting);

            if ($currentRemaining <= 0 || $invoice->status === 'paid') {
                throw new \InvalidArgumentException('Faktur invoice ini sudah lunas. Tidak dapat mencatat pembayaran baru.');
            }

            $amount = (float) $data['amount'];
            if ($amount <= 0) {
                throw new \InvalidArgumentException('Nominal pembayaran harus lebih besar dari 0.');
            }

            if ($amount > $currentRemaining) {
                throw new \InvalidArgumentException(
                    "Nominal pembayaran (Rp " . number_format($amount, 0, ',', '.') . ") melebihi sisa tagihan faktur (Rp " . number_format($currentRemaining, 0, ',', '.') . ")."
                );
            }

            $paymentNumber = $this->generatePaymentNumber($invoice->tenant_id);

            $payment = Payment::create([
                'tenant_id' => $invoice->tenant_id,
                'invoice_id' => $invoice->id,
                'order_id' => $invoice->order_id,
                'customer_id' => $invoice->customer_id,
                'payment_number' => $paymentNumber,
                'payment_date' => $data['payment_date'] ?? Carbon::now()->toDateString(),
                'amount' => $amount,
                'payment_method' => $data['payment_method'] ?? 'bank_transfer',
                'destination_bank_account' => $data['destination_bank_account'] ?? null,
                'reference_number' => $data['reference_number'] ?? null,
                'proof_image_url' => $data['proof_image_url'] ?? null,
                'status' => 'confirmed',
                'notes' => $data['notes'] ?? null,
                'received_by' => $receiver->id,
            ]);

            // Re-calculate invoice totals
            $totalPaidForInvoice = $totalPaidExisting + $amount;
            $invoiceRemaining = max(0, $invoiceTotal - $totalPaidForInvoice);

            $invoiceStatus = $invoiceRemaining <= 0 ? 'paid' : ($totalPaidForInvoice > 0 ? 'partially_paid' : 'unpaid');

            $invoice->update([
                'paid_amount' => $totalPaidForInvoice,
                'remaining_amount' => $invoiceRemaining,
                'status' => $invoiceStatus,
            ]);

            // Re-calculate order payment status
            if ($invoice->order_id) {
                $order = Order::find($invoice->order_id);
                if ($order) {
                    $totalPaidForOrder = (float) Payment::where('order_id', $order->id)
                        ->where('status', 'confirmed')
                        ->sum('amount');

                    $orderTotal = (float) $order->total_amount;
                    $orderPaymentStatus = $totalPaidForOrder >= $orderTotal ? 'paid' : ($totalPaidForOrder > 0 ? 'partially_paid' : 'unpaid');

                    $order->update([
                        'payment_status' => $orderPaymentStatus,
                        'down_payment_amount' => $totalPaidForOrder,
                    ]);
                }
            }

            return $payment;
        });
    }

    /**
     * Delete / Void a Payment and automatically recalculate invoice & order balances
     */
    public function deletePayment(Payment $payment): void
    {
        DB::transaction(function () use ($payment) {
            $invoiceId = $payment->invoice_id;
            $orderId = $payment->order_id;

            $payment->delete();

            if ($invoiceId) {
                $invoice = Invoice::find($invoiceId);
                if ($invoice) {
                    $totalPaidForInvoice = (float) Payment::where('invoice_id', $invoice->id)
                        ->where('status', 'confirmed')
                        ->sum('amount');

                    $invoiceTotal = (float) $invoice->total_amount;
                    $invoiceRemaining = max(0, $invoiceTotal - $totalPaidForInvoice);
                    $invoiceStatus = $invoiceRemaining <= 0 ? 'paid' : ($totalPaidForInvoice > 0 ? 'partially_paid' : 'unpaid');

                    $invoice->update([
                        'paid_amount' => $totalPaidForInvoice,
                        'remaining_amount' => $invoiceRemaining,
                        'status' => $invoiceStatus,
                    ]);
                }
            }

            if ($orderId) {
                $order = Order::find($orderId);
                if ($order) {
                    $totalPaidForOrder = (float) Payment::where('order_id', $order->id)
                        ->where('status', 'confirmed')
                        ->sum('amount');

                    $orderTotal = (float) $order->total_amount;
                    $orderPaymentStatus = $totalPaidForOrder >= $orderTotal ? 'paid' : ($totalPaidForOrder > 0 ? 'partially_paid' : 'unpaid');

                    $order->update([
                        'payment_status' => $orderPaymentStatus,
                        'down_payment_amount' => $totalPaidForOrder,
                    ]);
                }
            }
        });
    }

    /**
     * Get Accounts Receivable & Finance Summary for Dashboard / Invoices Page
     */
    public function getFinanceSummary(int $tenantId): array
    {
        $startOfMonth = Carbon::now()->startOfMonth()->toDateString();
        $endOfMonth = Carbon::now()->endOfMonth()->toDateString();

        $invoices = Invoice::where('tenant_id', $tenantId)->get();

        $totalReceivables = $invoices->whereIn('status', ['unpaid', 'partially_paid'])->sum('remaining_amount');
        $totalInvoicesCount = $invoices->count();
        $unpaidCount = $invoices->where('status', 'unpaid')->count();
        $partiallyPaidCount = $invoices->where('status', 'partially_paid')->count();
        $paidCount = $invoices->where('status', 'paid')->count();

        $paidThisMonth = Payment::where('tenant_id', $tenantId)
            ->where('status', 'confirmed')
            ->whereBetween('payment_date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        $totalRevenueAllTime = Payment::where('tenant_id', $tenantId)
            ->where('status', 'confirmed')
            ->sum('amount');

        return [
            'total_receivables' => (float) $totalReceivables,
            'paid_this_month' => (float) $paidThisMonth,
            'total_revenue_all_time' => (float) $totalRevenueAllTime,
            'total_invoices_count' => $totalInvoicesCount,
            'unpaid_count' => $unpaidCount,
            'partially_paid_count' => $partiallyPaidCount,
            'paid_count' => $paidCount,
        ];
    }
}
