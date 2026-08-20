<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\StockTransfer;
use App\Services\StockTransferService;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockTransferController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext,
        protected StockTransferService $transferService
    ) {}

    /**
     * List stock transfers.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $query = StockTransfer::with(['fromBranch', 'toBranch', 'items.rawMaterial', 'creator', 'receiver'])
            ->where('tenant_id', $tenant->id)
            ->orderBy('id', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('branch_id')) {
            $bId = (int) $request->branch_id;
            $query->where(function ($q) use ($bId) {
                $q->where('from_branch_id', $bId)->orWhere('to_branch_id', $bId);
            });
        }

        $perPage = (int) $request->input('per_page', 15);
        $paginated = $query->paginate($perPage);

        return $this->paginatedResponse($paginated, 'Daftar mutasi transfer stok berhasil diambil.');
    }

    /**
     * Create stock transfer.
     */
    public function store(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'from_branch_id' => ['required', 'integer', 'exists:branches,id'],
            'to_branch_id' => ['required', 'integer', 'exists:branches,id'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.raw_material_id' => ['required', 'integer', 'exists:raw_materials,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit' => ['nullable', 'string'],
            'items.*.notes' => ['nullable', 'string'],
        ]);

        $transfer = $this->transferService->createTransfer($tenant, $request->user(), $validated);

        return $this->successResponse($transfer, 'Pengajuan mutasi transfer stok berhasil dibuat.', 201);
    }

    /**
     * Dispatch / Ship transfer.
     */
    public function ship(int $id, Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $transfer = $this->transferService->shipTransfer($tenant, $id, $request->user());

        return $this->successResponse($transfer, 'Transfer stok telah dikirim (In-Transit) dan stok cabang asal telah dipotong.');
    }

    /**
     * Confirm receipt of transfer.
     */
    public function receive(int $id, Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $transfer = $this->transferService->receiveTransfer($tenant, $id, $request->user());

        return $this->successResponse($transfer, 'Penerimaan transfer stok berhasil dikonfirmasi dan stok cabang tujuan telah ditambahkan.');
    }

    /**
     * Cancel transfer.
     */
    public function cancel(int $id, Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $transfer = $this->transferService->cancelTransfer($tenant, $id, $request->user());

        return $this->successResponse($transfer, 'Mutasi transfer stok berhasil dibatalkan.');
    }
}
