<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaymentGatewayService
{
    public function __construct(
        protected FinanceService $financeService
    ) {}

    /**
     * Create Snap Token / Payment Payload for an Order or Invoice.
     */
    public function createPaymentTransaction(Order $order, ?Invoice $invoice = null, ?float $customAmount = null): array
    {
        $invoice = $invoice ?? $order->invoices()->first();
        $amount = $customAmount ?? ($invoice ? (float) $invoice->remaining_amount : (float) $order->total_amount);
        if ($amount <= 0) {
            $amount = (float) $order->total_amount;
        }

        $transactionId = 'PG-' . $order->order_number . '-' . time();
        $snapToken = 'SNAP-' . strtoupper(Str::random(12)) . '-' . $order->id;

        // In real environment, you call Midtrans SDK: \Midtrans\Snap::getSnapToken($params)
        // Here we provide a robust production-ready structure + sandbox mock simulator
        $order->update([
            'payment_gateway_provider' => 'midtrans',
            'payment_gateway_ref' => $transactionId,
            'snap_token' => $snapToken,
        ]);

        return [
            'order_id' => $order->id,
            'order_number' => $order->order_number,
            'invoice_id' => $invoice?->id,
            'invoice_number' => $invoice?->invoice_number,
            'transaction_id' => $transactionId,
            'snap_token' => $snapToken,
            'amount' => $amount,
            'currency' => 'IDR',
            'payment_methods' => [
                'qris' => [
                    'qr_string' => '00020101021226580016ID.CO.QRIS.WWW0118936000020111223344550215' . $transactionId . '5802ID5303360540' . (int)$amount . '5802ID',
                ],
                'virtual_accounts' => [
                    ['bank' => 'BCA', 'va_number' => '70009' . str_pad((string)$order->id, 7, '0', STR_PAD_LEFT)],
                    ['bank' => 'Mandiri', 'va_number' => '89000' . str_pad((string)$order->id, 7, '0', STR_PAD_LEFT)],
                    ['bank' => 'BRI', 'va_number' => '10293' . str_pad((string)$order->id, 7, '0', STR_PAD_LEFT)],
                    ['bank' => 'BNI', 'va_number' => '88012' . str_pad((string)$order->id, 7, '0', STR_PAD_LEFT)],
                ],
            ],
            'customer' => [
                'name' => $order->recipient_name ?? $order->customer?->name,
                'phone' => $order->recipient_phone ?? $order->customer?->phone,
                'email' => $order->customer?->email,
            ],
        ];
    }

    /**
     * Handle Webhook Notification from Payment Gateway.
     */
    public function handleWebhookNotification(array $payload): array
    {
        $orderNumber = $payload['order_id'] ?? $payload['order_number'] ?? null;
        $transactionStatus = strtolower($payload['transaction_status'] ?? $payload['status'] ?? 'settlement');
        $fraudStatus = strtolower($payload['fraud_status'] ?? 'accept');
        $grossAmount = (float) ($payload['gross_amount'] ?? $payload['amount'] ?? 0);
        $paymentType = strtolower($payload['payment_type'] ?? 'qris');
        $transactionId = $payload['transaction_id'] ?? ('TXN-' . time());

        Log::info('Payment Gateway Webhook received:', $payload);

        // Find Order by order_number or payment_gateway_ref
        $order = Order::with(['invoices', 'customer'])
            ->where('order_number', $orderNumber)
            ->orWhere('payment_gateway_ref', $orderNumber)
            ->orWhere('tracking_code', $orderNumber)
            ->first();

        if (!$order) {
            return [
                'success' => false,
                'message' => "Order {$orderNumber} not found.",
            ];
        }

        // Process successful payment settlement / capture
        if (in_array($transactionStatus, ['settlement', 'capture', 'paid', 'success']) && $fraudStatus === 'accept') {
            return DB::transaction(function () use ($order, $grossAmount, $paymentType, $transactionId) {
                $invoice = $order->invoices()->first();
                if (!$invoice) {
                    $invoice = $this->financeService->createInvoiceForOrder($order, ['invoice_type' => 'full']);
                }

                $paidAmount = $grossAmount > 0 ? $grossAmount : (float) $invoice->remaining_amount;

                // Create confirmed payment record
                $paymentNumber = 'PAY/' . Carbon::now()->format('Ym') . '/' . rand(1000, 9999);
                $payment = Payment::create([
                    'tenant_id' => $order->tenant_id,
                    'invoice_id' => $invoice->id,
                    'order_id' => $order->id,
                    'customer_id' => $order->customer_id,
                    'payment_number' => $paymentNumber,
                    'payment_date' => Carbon::now()->toDateString(),
                    'amount' => $paidAmount,
                    'payment_method' => $paymentType === 'qris' ? 'qris' : 'bank_transfer',
                    'reference_number' => $transactionId,
                    'status' => 'confirmed',
                    'notes' => 'Pembayaran otomatis diverifikasi via Online Payment Gateway (' . strtoupper($paymentType) . ')',
                ]);

                // Update Invoice
                $newPaidAmount = (float) $invoice->paid_amount + $paidAmount;
                $newRemaining = max(0, (float) $invoice->total_amount - $newPaidAmount);
                $newInvoiceStatus = $newRemaining <= 0 ? 'paid' : ($newPaidAmount > 0 ? 'partially_paid' : 'unpaid');

                $invoice->update([
                    'paid_amount' => $newPaidAmount,
                    'remaining_amount' => $newRemaining,
                    'status' => $newInvoiceStatus,
                ]);

                // Update Order Status & Payment Status
                $newOrderPaymentStatus = $newRemaining <= 0 ? 'paid' : 'partially_paid';
                $oldOrderStatus = $order->status;
                $newOrderStatus = $oldOrderStatus === 'draft' ? 'confirmed' : $oldOrderStatus;

                $order->update([
                    'payment_status' => $newOrderPaymentStatus,
                    'status' => $newOrderStatus,
                    'down_payment_amount' => $newPaidAmount,
                ]);

                // Record status history if changed
                if ($oldOrderStatus !== $newOrderStatus) {
                    OrderStatusHistory::create([
                        'tenant_id' => $order->tenant_id,
                        'order_id' => $order->id,
                        'from_status' => $oldOrderStatus,
                        'to_status' => $newOrderStatus,
                        'notes' => 'Status otomatis terkonfirmasi setelah pembayaran online diterima.',
                    ]);
                }

                return [
                    'success' => true,
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'payment_id' => $payment->id,
                    'payment_number' => $payment->payment_number,
                    'invoice_status' => $newInvoiceStatus,
                    'order_status' => $newOrderStatus,
                    'paid_amount' => $paidAmount,
                ];
            });
        }

        return [
            'success' => true,
            'message' => "Transaction status {$transactionStatus} processed without settlement.",
        ];
    }
}
