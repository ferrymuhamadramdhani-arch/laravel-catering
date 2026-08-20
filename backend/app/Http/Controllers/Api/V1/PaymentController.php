<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\FinanceService;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Pembayaran (Payments)', description: 'Endpoint Pencatatan & Riwayat Pembayaran')]
class PaymentController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext,
        protected FinanceService $financeService
    ) {}

    /**
     * List payments for tenant.
     */
    #[OA\Get(
        path: '/tenant/payments',
        summary: 'Daftar Riwayat Pembayaran',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Pembayaran (Payments)'],
        responses: [
            new OA\Response(response: 200, description: 'Riwayat pembayaran berhasil diambil'),
        ]
    )]
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $query = Payment::with(['invoice', 'order', 'customer', 'receiver'])
            ->where('tenant_id', $tenant->id)
            ->orderBy('id', 'desc');

        if ($request->filled('invoice_id')) {
            $query->where('invoice_id', $request->invoice_id);
        }

        if ($request->filled('order_id')) {
            $query->where('order_id', $request->order_id);
        }

        if ($request->filled('payment_method') && $request->payment_method !== 'all') {
            $query->where('payment_method', $request->payment_method);
        }

        $perPage = min((int) ($request->per_page ?? 15), 100);
        $payments = $query->paginate($perPage);

        return $this->paginatedResponse($payments, 'Riwayat pembayaran berhasil diambil.');
    }

    /**
     * Record a new payment against an invoice.
     */
    #[OA\Post(
        path: '/tenant/invoices/{invoiceId}/payments',
        summary: 'Catat Pembayaran Invoice',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Pembayaran (Payments)'],
        responses: [
            new OA\Response(response: 201, description: 'Pembayaran berhasil dicatat'),
        ]
    )]
    public function store(Request $request, int $invoiceId): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $invoice = Invoice::where('tenant_id', $tenant->id)->find($invoiceId);
        if (!$invoice) {
            return $this->errorResponse('Invoice tidak ditemukan.', 404);
        }

        if ($invoice->status === 'paid') {
            return $this->errorResponse('Invoice ini sudah lunas.', 422);
        }

        if ($invoice->status === 'cancelled') {
            return $this->errorResponse('Tidak dapat mencatat pembayaran pada invoice yang dibatalkan.', 422);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'payment_date' => 'nullable|date',
            'payment_method' => 'required|in:bank_transfer,cash,qris,other',
            'destination_bank_account' => 'nullable|string|max:255',
            'reference_number' => 'nullable|string|max:100',
            'proof_image_url' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $payment = $this->financeService->recordPayment($invoice, $validated, $request->user());
            $payment->load(['invoice', 'order', 'receiver']);

            return $this->successResponse($payment, 'Pembayaran berhasil dicatat.', 201);
        } catch (\Exception $e) {
            return $this->errorResponse('Gagal mencatat pembayaran: ' . $e->getMessage(), 422);
        }
    }
}
