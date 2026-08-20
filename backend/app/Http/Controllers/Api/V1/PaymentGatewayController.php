<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\PaymentGatewayService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Payment Gateway', description: 'Integrasi Pembayaran Online (Midtrans / QRIS / VA) & Webhook')]
class PaymentGatewayController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected PaymentGatewayService $paymentGatewayService
    ) {}

    /**
     * Create Snap Token / Online Payment Transaction for an Order.
     */
    public function createPaymentToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => 'required_without:order_number|exists:orders,id',
            'order_number' => 'required_without:order_id|string',
            'amount' => 'nullable|numeric|min:1000',
        ]);

        $query = Order::with(['customer', 'invoices']);
        if (!empty($validated['order_id'])) {
            $order = $query->find($validated['order_id']);
        } else {
            $order = $query->where('order_number', $validated['order_number'])
                ->orWhere('tracking_code', $validated['order_number'])
                ->first();
        }

        if (!$order) {
            return $this->errorResponse('Pesanan tidak ditemukan.', 404);
        }

        $customAmount = isset($validated['amount']) ? (float) $validated['amount'] : null;
        $transactionData = $this->paymentGatewayService->createPaymentTransaction($order, null, $customAmount);

        return $this->successResponse($transactionData, 'Token transaksi pembayaran online berhasil diterbitkan.');
    }

    /**
     * Webhook Endpoint for Payment Gateway Notifications.
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        $payload = $request->all();
        $result = $this->paymentGatewayService->handleWebhookNotification($payload);

        if (!($result['success'] ?? false)) {
            return response()->json($result, 400);
        }

        return response()->json([
            'status' => 'OK',
            'message' => 'Notification processed successfully.',
            'data' => $result,
        ], 200);
    }

    /**
     * Sandbox Payment Simulator (Instant Settlement Trigger for Testing).
     */
    public function simulatePayment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_number' => 'required|string',
            'amount' => 'nullable|numeric|min:1000',
            'payment_type' => 'nullable|in:qris,bank_transfer,credit_card',
        ]);

        $payload = [
            'order_id' => $validated['order_number'],
            'transaction_status' => 'settlement',
            'fraud_status' => 'accept',
            'gross_amount' => $validated['amount'] ?? null,
            'payment_type' => $validated['payment_type'] ?? 'qris',
            'transaction_id' => 'SIM-' . time() . '-' . rand(100, 999),
        ];

        $result = $this->paymentGatewayService->handleWebhookNotification($payload);

        if (!($result['success'] ?? false)) {
            return $this->errorResponse($result['message'] ?? 'Gagal memproses simulasi pembayaran.', 400);
        }

        return $this->successResponse($result, 'Simulasi pembayaran online berhasil dikonfirmasi lunas.');
    }
}
