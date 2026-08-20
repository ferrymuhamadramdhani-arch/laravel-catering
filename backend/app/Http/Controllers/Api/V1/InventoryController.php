<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\RawMaterial;
use App\Models\StockLedger;
use App\Services\InventoryService;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Inventaris & Stok', description: 'Endpoint Manajemen Mutasi Stok Bahan Baku & Stock Ledger')]
class InventoryController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext,
        protected InventoryService $inventoryService
    ) {}

    /**
     * Get inventory summary metrics.
     */
    #[OA\Get(
        path: '/tenant/inventory/summary',
        summary: 'Ringkasan Metrik Inventaris',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Inventaris & Stok'],
        responses: [
            new OA\Response(response: 200, description: 'Ringkasan inventaris berhasil diambil'),
        ]
    )]
    public function summary(): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $summary = $this->inventoryService->getInventorySummary($tenant);

        return $this->successResponse($summary, 'Ringkasan inventaris berhasil diambil.');
    }

    /**
     * Get list of materials with low or empty stock alert.
     */
    #[OA\Get(
        path: '/tenant/inventory/low-stock',
        summary: 'Daftar Bahan Baku Stok Menipis & Habis',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Inventaris & Stok'],
        responses: [
            new OA\Response(response: 200, description: 'Daftar alert stok berhasil diambil'),
        ]
    )]
    public function lowStock(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $query = RawMaterial::with('supplier')
            ->where('tenant_id', $tenant->id)
            ->whereColumn('current_stock', '<=', 'minimum_stock')
            ->orderBy('current_stock', 'asc')
            ->orderBy('name', 'asc');

        if ($request->boolean('all')) {
            return $this->successResponse($query->get(), 'Daftar bahan baku menipis berhasil diambil.');
        }

        $perPage = (int) $request->input('per_page', 10);
        $paginated = $query->paginate($perPage);

        return $this->paginatedResponse($paginated, 'Daftar bahan baku menipis berhasil diambil.');
    }

    /**
     * Get stock movement ledger history.
     */
    #[OA\Get(
        path: '/tenant/inventory/ledgers',
        summary: 'Riwayat Mutasi Stok (Stock Ledger)',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Inventaris & Stok'],
        parameters: [
            new OA\Parameter(name: 'raw_material_id', in: 'query', required: false, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'type', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['in', 'out', 'adjustment'])),
            new OA\Parameter(name: 'date_from', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date')),
            new OA\Parameter(name: 'date_to', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date')),
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 10)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Riwayat mutasi stok berhasil diambil'),
        ]
    )]
    public function ledgers(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $query = StockLedger::with(['rawMaterial', 'creator'])
            ->where('tenant_id', $tenant->id)
            ->orderBy('id', 'desc');

        if ($request->filled('raw_material_id')) {
            $query->where('raw_material_id', $request->input('raw_material_id'));
        }

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('notes', 'like', "%{$search}%")
                  ->orWhereHas('rawMaterial', function ($mq) use ($search) {
                      $mq->where('name', 'like', "%{$search}%")
                         ->orWhere('code', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = (int) $request->input('per_page', 10);
        $paginated = $query->paginate($perPage);

        return $this->paginatedResponse($paginated, 'Riwayat mutasi stok berhasil diambil.');
    }

    /**
     * Record stock in (Penerimaan / Belanja Bahan).
     */
    #[OA\Post(
        path: '/tenant/inventory/stock-in',
        summary: 'Pencatatan Stok Masuk',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Inventaris & Stok'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['raw_material_id', 'quantity'],
                properties: [
                    new OA\Property(property: 'raw_material_id', type: 'integer', example: 1),
                    new OA\Property(property: 'quantity', type: 'number', example: 10),
                    new OA\Property(property: 'unit_cost', type: 'number', example: 48000),
                    new OA\Property(property: 'notes', type: 'string', example: 'Belanja Pasar Kramat Jati - Nota #9821'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Stok masuk berhasil dicatat'),
            new OA\Response(response: 422, description: 'Validasi gagal'),
        ]
    )]
    public function stockIn(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'raw_material_id' => ['required', 'integer', 'exists:raw_materials,id'],
            'quantity' => ['required', 'numeric', 'gt:0'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
            'reference_type' => ['nullable', 'string', 'max:50'],
            'reference_id' => ['nullable', 'integer'],
        ]);

        $material = RawMaterial::where('tenant_id', $tenant->id)->find($validated['raw_material_id']);
        if (!$material) {
            return $this->errorResponse('Bahan baku tidak ditemukan.', 404);
        }

        $ledger = $this->inventoryService->recordStockIn(
            $tenant,
            $material,
            (float) $validated['quantity'],
            isset($validated['unit_cost']) ? (float) $validated['unit_cost'] : null,
            $validated['notes'] ?? null,
            $request->user(),
            $validated['reference_type'] ?? 'purchase_receipt',
            $validated['reference_id'] ?? null
        );

        return $this->successResponse($ledger->load('rawMaterial'), 'Stok masuk berhasil dicatat.', 201);
    }

    /**
     * Record stock out (Pemakaian / Bahan Rusak / Kadaluarsa).
     */
    #[OA\Post(
        path: '/tenant/inventory/stock-out',
        summary: 'Pencatatan Stok Keluar',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Inventaris & Stok'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['raw_material_id', 'quantity'],
                properties: [
                    new OA\Property(property: 'raw_material_id', type: 'integer', example: 1),
                    new OA\Property(property: 'quantity', type: 'number', example: 2.5),
                    new OA\Property(property: 'reference_type', type: 'string', example: 'waste_damage'),
                    new OA\Property(property: 'notes', type: 'string', example: 'Daging rusak saat thawing'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Stok keluar berhasil dicatat'),
            new OA\Response(response: 422, description: 'Validasi gagal'),
        ]
    )]
    public function stockOut(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'raw_material_id' => ['required', 'integer', 'exists:raw_materials,id'],
            'quantity' => ['required', 'numeric', 'gt:0'],
            'notes' => ['nullable', 'string', 'max:500'],
            'reference_type' => ['nullable', 'string', 'max:50'],
            'reference_id' => ['nullable', 'integer'],
        ]);

        $material = RawMaterial::where('tenant_id', $tenant->id)->find($validated['raw_material_id']);
        if (!$material) {
            return $this->errorResponse('Bahan baku tidak ditemukan.', 404);
        }

        $ledger = $this->inventoryService->recordStockOut(
            $tenant,
            $material,
            (float) $validated['quantity'],
            $validated['notes'] ?? null,
            $request->user(),
            $validated['reference_type'] ?? 'waste_damage',
            $validated['reference_id'] ?? null
        );

        return $this->successResponse($ledger->load('rawMaterial'), 'Stok keluar berhasil dicatat.', 201);
    }

    /**
     * Record stock opname adjustment (Penyesuaian Fisik Aktual).
     */
    #[OA\Post(
        path: '/tenant/inventory/adjust',
        summary: 'Pencatatan Stock Opname / Penyesuaian Stok',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Inventaris & Stok'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['raw_material_id', 'physical_stock'],
                properties: [
                    new OA\Property(property: 'raw_material_id', type: 'integer', example: 1),
                    new OA\Property(property: 'physical_stock', type: 'number', example: 15),
                    new OA\Property(property: 'notes', type: 'string', example: 'Hasil audit stok fisik mingguan'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Penyesuaian stok opname berhasil dicatat'),
            new OA\Response(response: 422, description: 'Validasi gagal'),
        ]
    )]
    public function adjust(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'raw_material_id' => ['required', 'integer', 'exists:raw_materials,id'],
            'physical_stock' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $material = RawMaterial::where('tenant_id', $tenant->id)->find($validated['raw_material_id']);
        if (!$material) {
            return $this->errorResponse('Bahan baku tidak ditemukan.', 404);
        }

        $ledger = $this->inventoryService->recordStockAdjustment(
            $tenant,
            $material,
            (float) $validated['physical_stock'],
            $validated['notes'] ?? null,
            $request->user()
        );

        return $this->successResponse($ledger->load('rawMaterial'), 'Penyesuaian stok opname berhasil dicatat.', 201);
    }
}
