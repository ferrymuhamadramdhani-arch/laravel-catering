<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Services\ProcurementService;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Pengadaan (Purchase Orders)', description: 'Endpoint Manajemen Pembelian & Pengadaan Bahan Baku')]
class PurchaseOrderController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext,
        protected ProcurementService $procurementService
    ) {}

    /**
     * Get purchase orders list.
     */
    #[OA\Get(
        path: '/tenant/purchase-orders',
        summary: 'Daftar Purchase Order',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Pengadaan (Purchase Orders)'],
        responses: [
            new OA\Response(response: 200, description: 'Daftar PO berhasil diambil'),
        ]
    )]
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $query = PurchaseOrder::with(['supplier', 'items.rawMaterial', 'creator', 'approver'])
            ->where('tenant_id', $tenant->id)
            ->orderBy('id', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('supplier_id') && $request->supplier_id !== 'all') {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('po_number', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%")
                  ->orWhereHas('supplier', function ($sq) use ($search) {
                      $sq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = (int) $request->input('per_page', 10);
        $paginated = $query->paginate($perPage);

        return $this->paginatedResponse($paginated, 'Daftar PO berhasil diambil.');
    }

    /**
     * Store new purchase order.
     */
    #[OA\Post(
        path: '/tenant/purchase-orders',
        summary: 'Buat Purchase Order Baru',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Pengadaan (Purchase Orders)'],
        responses: [
            new OA\Response(response: 201, description: 'PO berhasil dibuat'),
        ]
    )]
    public function store(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'order_date' => ['required', 'date'],
            'expected_delivery_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.raw_material_id' => ['required', 'integer', 'exists:raw_materials,id'],
            'items.*.quantity_ordered' => ['required', 'numeric', 'gt:0'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        $po = $this->procurementService->createPurchaseOrder($tenant, $validated, $request->user());

        return $this->successResponse($po, 'Purchase order berhasil dibuat.', 201);
    }

    /**
     * Show purchase order detail.
     */
    #[OA\Get(
        path: '/tenant/purchase-orders/{id}',
        summary: 'Detail Purchase Order',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Pengadaan (Purchase Orders)'],
        responses: [
            new OA\Response(response: 200, description: 'Detail PO berhasil diambil'),
        ]
    )]
    public function show(int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $po = PurchaseOrder::with(['supplier', 'items.rawMaterial', 'goodsReceipts.items.rawMaterial', 'creator', 'approver'])
            ->where('tenant_id', $tenant->id)
            ->find($id);

        if (!$po) {
            return $this->errorResponse('Purchase order tidak ditemukan.', 404);
        }

        return $this->successResponse($po, 'Detail PO berhasil diambil.');
    }

    /**
     * Approve purchase order.
     */
    #[OA\Patch(
        path: '/tenant/purchase-orders/{id}/approve',
        summary: 'Setujui (Approve) Purchase Order & Buat Draft Penerimaan',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Pengadaan (Purchase Orders)'],
        responses: [
            new OA\Response(response: 200, description: 'PO berhasil disetujui'),
        ]
    )]
    public function approve(int $id, Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $po = PurchaseOrder::with('items')
            ->where('tenant_id', $tenant->id)
            ->find($id);

        if (!$po) {
            return $this->errorResponse('Purchase order tidak ditemukan.', 404);
        }

        if ($po->status !== 'draft') {
            return $this->errorResponse("Purchase order tidak dapat disetujui karena berstatus: {$po->status}", 400);
        }

        $receipt = $this->procurementService->approvePurchaseOrder($po, $request->user());

        return $this->successResponse([
            'purchase_order' => $po->fresh(['supplier', 'items.rawMaterial']),
            'goods_receipt' => $receipt,
        ], 'Purchase order berhasil disetujui dan draft penerimaan stok dibuat.');
    }

    /**
     * Cancel purchase order.
     */
    #[OA\Patch(
        path: '/tenant/purchase-orders/{id}/cancel',
        summary: 'Batalkan Purchase Order',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Pengadaan (Purchase Orders)'],
        responses: [
            new OA\Response(response: 200, description: 'PO berhasil dibatalkan'),
        ]
    )]
    public function cancel(int $id, Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $po = PurchaseOrder::where('tenant_id', $tenant->id)->find($id);
        if (!$po) {
            return $this->errorResponse('Purchase order tidak ditemukan.', 404);
        }

        if (in_array($po->status, ['completed', 'cancelled'])) {
            return $this->errorResponse("Purchase order tidak dapat dibatalkan karena berstatus: {$po->status}", 400);
        }

        $po->status = 'cancelled';
        $po->save();

        return $this->successResponse($po, 'Purchase order berhasil dibatalkan.');
    }

    /**
     * Get auto-suggest purchase orders recommendation.
     */
    #[OA\Get(
        path: '/tenant/purchase-orders/suggestions',
        summary: 'Rekomendasi Auto-Suggest PO dari Kebutuhan Dapur & Stok Minimum',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Pengadaan (Purchase Orders)'],
        responses: [
            new OA\Response(response: 200, description: 'Rekomendasi PO berhasil dihitung'),
        ]
    )]
    public function suggestions(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $targetDate = $request->input('target_date');
        $suggestions = $this->procurementService->autoSuggestPurchaseOrders($tenant, $targetDate);

        return $this->successResponse($suggestions, 'Rekomendasi pengadaan berhasil dihitung.');
    }

    /**
     * Create multiple draft POs from auto-suggest recommendations.
     */
    #[OA\Post(
        path: '/tenant/purchase-orders/from-suggestions',
        summary: 'Buat Draft PO Masal dari Rekomendasi Pengadaan',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Pengadaan (Purchase Orders)'],
        responses: [
            new OA\Response(response: 201, description: 'Draft PO berhasil dibuat masal'),
        ]
    )]
    public function createFromSuggestions(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'suggestions' => ['required', 'array', 'min:1'],
            'suggestions.*.supplier_id' => ['nullable', 'integer'],
            'suggestions.*.items' => ['required', 'array', 'min:1'],
            'suggestions.*.items.*.raw_material_id' => ['required', 'integer', 'exists:raw_materials,id'],
            'suggestions.*.items.*.suggested_quantity' => ['required', 'numeric', 'gt:0'],
            'suggestions.*.items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $createdPos = $this->procurementService->createPurchaseOrdersFromSuggestions(
            $tenant,
            $validated['suggestions'],
            $request->user()
        );

        return $this->successResponse($createdPos, count($createdPos) . ' Draft Purchase Order berhasil dibuat otomatis.', 201);
    }

    /**
     * Get price history trend for materials.
     */
    #[OA\Get(
        path: '/tenant/purchase-orders/price-history',
        summary: 'Riwayat Harga Pembelian Bahan Baku',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Pengadaan (Purchase Orders)'],
        responses: [
            new OA\Response(response: 200, description: 'Riwayat harga berhasil diambil'),
        ]
    )]
    public function priceHistory(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $materialId = $request->filled('raw_material_id') ? (int) $request->raw_material_id : null;
        $history = $this->procurementService->getMaterialPriceHistory($tenant, $materialId);

        return $this->successResponse($history, 'Riwayat harga bahan baku berhasil diambil.');
    }
}
