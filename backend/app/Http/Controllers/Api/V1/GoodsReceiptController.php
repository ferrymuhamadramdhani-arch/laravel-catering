<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\GoodsReceipt;
use App\Services\ProcurementService;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Penerimaan Barang (Goods Receipts)', description: 'Endpoint Penerimaan Barang PO & Verifikasi Fisik')]
class GoodsReceiptController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext,
        protected ProcurementService $procurementService
    ) {}

    /**
     * Get goods receipts list (pending drafts vs received).
     */
    #[OA\Get(
        path: '/tenant/inventory/goods-receipts',
        summary: 'Daftar Penerimaan Barang (Goods Receipts)',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Penerimaan Barang (Goods Receipts)'],
        responses: [
            new OA\Response(response: 200, description: 'Daftar penerimaan berhasil diambil'),
        ]
    )]
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $query = GoodsReceipt::with(['purchaseOrder', 'supplier', 'items.rawMaterial', 'receiver'])
            ->where('tenant_id', $tenant->id)
            ->orderBy('id', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('receipt_number', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%")
                  ->orWhereHas('purchaseOrder', function ($pq) use ($search) {
                      $pq->where('po_number', 'like', "%{$search}%");
                  })
                  ->orWhereHas('supplier', function ($sq) use ($search) {
                      $sq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = (int) $request->input('per_page', 10);
        $paginated = $query->paginate($perPage);

        return $this->paginatedResponse($paginated, 'Daftar penerimaan barang berhasil diambil.');
    }

    /**
     * Show detail goods receipt.
     */
    #[OA\Get(
        path: '/tenant/inventory/goods-receipts/{id}',
        summary: 'Detail Penerimaan Barang',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Penerimaan Barang (Goods Receipts)'],
        responses: [
            new OA\Response(response: 200, description: 'Detail penerimaan berhasil diambil'),
        ]
    )]
    public function show(int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $receipt = GoodsReceipt::with(['purchaseOrder.items.rawMaterial', 'supplier', 'items.rawMaterial', 'receiver'])
            ->where('tenant_id', $tenant->id)
            ->find($id);

        if (!$receipt) {
            return $this->errorResponse('Dokumen penerimaan tidak ditemukan.', 404);
        }

        return $this->successResponse($receipt, 'Detail penerimaan barang berhasil diambil.');
    }

    /**
     * Process & confirm physical goods receipt (Increases stock, updates PO).
     */
    #[OA\Post(
        path: '/tenant/inventory/goods-receipts/{id}/receive',
        summary: 'Konfirmasi Penerimaan Fisik di Gudang',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Penerimaan Barang (Goods Receipts)'],
        responses: [
            new OA\Response(response: 200, description: 'Barang berhasil diterima dan stok bertambah'),
        ]
    )]
    public function receive(int $id, Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $receipt = GoodsReceipt::with(['items', 'purchaseOrder'])
            ->where('tenant_id', $tenant->id)
            ->find($id);

        if (!$receipt) {
            return $this->errorResponse('Dokumen penerimaan tidak ditemukan.', 404);
        }

        if ($receipt->status === 'received') {
            return $this->errorResponse('Dokumen penerimaan ini sudah diproses sebelumnya.', 400);
        }

        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['nullable', 'array'],
            'items.*.goods_receipt_item_id' => ['nullable', 'integer'],
            'items.*.raw_material_id' => ['nullable', 'integer'],
            'items.*.quantity_received' => ['required', 'numeric', 'min:0'],
            'items.*.unit_cost' => ['nullable', 'numeric', 'min:0'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        $itemsMap = [];
        if (!empty($validated['items'])) {
            foreach ($validated['items'] as $it) {
                if (isset($it['goods_receipt_item_id'])) {
                    $itemsMap[$it['goods_receipt_item_id']] = $it;
                } elseif (isset($it['raw_material_id'])) {
                    $itemsMap[$it['raw_material_id']] = $it;
                }
            }
        }

        $processed = $this->procurementService->processGoodsReceipt(
            $receipt,
            $itemsMap,
            $validated['notes'] ?? null,
            $request->user()
        );

        return $this->successResponse($processed, 'Penerimaan barang berhasil dikonfirmasi. Stok resmi bertambah ke gudang.');
    }
}
