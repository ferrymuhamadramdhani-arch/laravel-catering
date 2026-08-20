<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Order;
use App\Services\FinanceService;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Keuangan & Invoicing', description: 'Endpoint Manajemen Invoice, Piutang & Pembayaran')]
class InvoiceController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext,
        protected FinanceService $financeService
    ) {}

    /**
     * Get invoices list with filtering and pagination.
     */
    #[OA\Get(
        path: '/tenant/invoices',
        summary: 'Daftar Invoice & Piutang',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Keuangan & Invoicing'],
        responses: [
            new OA\Response(response: 200, description: 'Daftar invoice berhasil diambil'),
        ]
    )]
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $query = Invoice::with([
            'order.items.menuItem',
            'order.items.menuPackage',
            'customer',
            'creator',
            'payments.receiver',
            'tenant'
        ])
            ->where('tenant_id', $tenant->id)
            ->orderBy('id', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('customer_id') && $request->customer_id !== 'all') {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('invoice_type') && $request->invoice_type !== 'all') {
            $query->where('invoice_type', $request->invoice_type);
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%")
                  ->orWhereHas('customer', function ($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%")
                         ->orWhere('phone', 'like', "%{$search}%");
                  })
                  ->orWhereHas('order', function ($oq) use ($search) {
                      $oq->where('order_number', 'like', "%{$search}%")
                         ->orWhere('event_name', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = min((int) ($request->per_page ?? 15), 100);
        $invoices = $query->paginate($perPage);

        return $this->paginatedResponse($invoices, 'Daftar invoice berhasil diambil.');
    }

    /**
     * Create Invoice for an Order.
     */
    #[OA\Post(
        path: '/tenant/invoices',
        summary: 'Buat Faktur / Invoice dari Pesanan',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Keuangan & Invoicing'],
        responses: [
            new OA\Response(response: 201, description: 'Invoice berhasil diterbitkan'),
        ]
    )]
    public function store(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'invoice_type' => 'nullable|in:full,down_payment,final_settlement',
            'invoice_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'total_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
            'terms_and_conditions' => 'nullable|string|max:2000',
        ]);

        $order = Order::where('tenant_id', $tenant->id)->find($validated['order_id']);
        if (!$order) {
            return $this->errorResponse('Pesanan tidak ditemukan atau bukan milik tenant ini.', 404);
        }

        try {
            $invoice = $this->financeService->createInvoiceForOrder($order, $validated, $request->user());
            $invoice->load(['order.items', 'customer', 'creator', 'payments']);

            return $this->successResponse($invoice, 'Invoice berhasil dibuat.', 201);
        } catch (\Exception $e) {
            return $this->errorResponse('Gagal membuat invoice: ' . $e->getMessage(), 422);
        }
    }

    /**
     * Get Invoice details.
     */
    #[OA\Get(
        path: '/tenant/invoices/{id}',
        summary: 'Detail Invoice Lengkap',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Keuangan & Invoicing'],
        responses: [
            new OA\Response(response: 200, description: 'Detail invoice berhasil diambil'),
        ]
    )]
    public function show(int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $invoice = Invoice::with([
            'order.items.menuItem',
            'order.items.menuPackage',
            'order.deliveryArea',
            'customer',
            'creator',
            'payments.receiver',
            'tenant'
        ])
        ->where('tenant_id', $tenant->id)
        ->find($id);

        if (!$invoice) {
            return $this->errorResponse('Invoice tidak ditemukan.', 404);
        }

        return $this->successResponse($invoice, 'Detail invoice berhasil diambil.');
    }

    /**
     * Get finance summary & accounts receivable metrics.
     */
    #[OA\Get(
        path: '/tenant/finance/summary',
        summary: 'Ringkasan Metrik Piutang & Keuangan',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Keuangan & Invoicing'],
        responses: [
            new OA\Response(response: 200, description: 'Ringkasan keuangan berhasil diambil'),
        ]
    )]
    public function summary(): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $summary = $this->financeService->getFinanceSummary($tenant->id);

        return $this->successResponse($summary, 'Ringkasan keuangan berhasil diambil.');
    }

    /**
     * Cancel an invoice.
     */
    #[OA\Delete(
        path: '/tenant/invoices/{id}',
        summary: 'Batalkan Invoice',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Keuangan & Invoicing'],
        responses: [
            new OA\Response(response: 200, description: 'Invoice berhasil dibatalkan'),
        ]
    )]
    public function destroy(int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $invoice = Invoice::where('tenant_id', $tenant->id)->find($id);
        if (!$invoice) {
            return $this->errorResponse('Invoice tidak ditemukan.', 404);
        }

        if ($invoice->paid_amount > 0) {
            return $this->errorResponse('Invoice yang sudah memiliki pembayaran tidak dapat dibatalkan secara langsung.', 422);
        }

        $invoice->update(['status' => 'cancelled']);

        return $this->successResponse(null, 'Invoice berhasil dibatalkan.');
    }
}
