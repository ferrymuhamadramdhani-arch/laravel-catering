<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\BranchService;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext,
        protected BranchService $branchService
    ) {}

    /**
     * List all branches.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $onlyActive = $request->boolean('active_only', false);
        $branches = $this->branchService->listBranches($tenant, $onlyActive);

        return $this->successResponse($branches, 'Daftar cabang dapur berhasil diambil.');
    }

    /**
     * Create a new branch.
     */
    public function store(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'code' => ['nullable', 'string', 'max:50'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:100'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'pic_name' => ['nullable', 'string', 'max:100'],
            'is_main' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $branch = $this->branchService->createBranch($tenant, $validated);

        return $this->successResponse($branch, 'Cabang dapur baru berhasil ditambahkan.', 201);
    }

    /**
     * Show single branch.
     */
    public function show(int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $branches = $this->branchService->listBranches($tenant);
        $branch = $branches->firstWhere('id', $id);

        if (!$branch) {
            return $this->errorResponse('Cabang dapur tidak ditemukan.', 404);
        }

        return $this->successResponse($branch, 'Detail cabang berhasil diambil.');
    }

    /**
     * Update branch.
     */
    public function update(int $id, Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'code' => ['nullable', 'string', 'max:50'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:100'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'pic_name' => ['nullable', 'string', 'max:100'],
            'is_main' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $branch = $this->branchService->updateBranch($tenant, $id, $validated);

        return $this->successResponse($branch, 'Data cabang berhasil diperbarui.');
    }

    /**
     * Delete branch.
     */
    public function destroy(int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $this->branchService->deleteBranch($tenant, $id);

        return $this->successResponse(null, 'Cabang dapur berhasil dihapus.');
    }
}
