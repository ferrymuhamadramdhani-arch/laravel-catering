<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class BranchService
{
    /**
     * Ensure a default main kitchen branch exists for tenant.
     */
    public function ensureDefaultBranch(Tenant $tenant): Branch
    {
        $existing = Branch::where('tenant_id', $tenant->id)->where('is_main', true)->first();
        if ($existing) {
            return $existing;
        }

        return Branch::create([
            'tenant_id' => $tenant->id,
            'name' => 'Dapur Pusat (Central Kitchen)',
            'code' => 'HQ-01',
            'phone' => $tenant->phone ?? '0812000000',
            'email' => $tenant->email ?? 'central@catering.id',
            'address' => $tenant->address ?? 'Pusat Operasional',
            'city' => 'Jakarta Pusat',
            'pic_name' => 'Kepala Dapur Utama',
            'is_main' => true,
            'is_active' => true,
        ]);
    }

    /**
     * List all branches for tenant.
     */
    public function listBranches(Tenant $tenant, bool $onlyActive = false): Collection
    {
        $this->ensureDefaultBranch($tenant);

        $query = Branch::where('tenant_id', $tenant->id)
            ->withCount(['orders', 'outgoingTransfers', 'incomingTransfers'])
            ->orderBy('is_main', 'desc')
            ->orderBy('name', 'asc');

        if ($onlyActive) {
            $query->where('is_active', true);
        }

        return $query->get();
    }

    /**
     * Create a new branch / satellite kitchen.
     */
    public function createBranch(Tenant $tenant, array $data): Branch
    {
        $data['tenant_id'] = $tenant->id;

        if (!empty($data['is_main'])) {
            // Unset previous main branch
            Branch::where('tenant_id', $tenant->id)->update(['is_main' => false]);
        }

        return Branch::create($data);
    }

    /**
     * Update an existing branch.
     */
    public function updateBranch(Tenant $tenant, int $branchId, array $data): Branch
    {
        $branch = Branch::where('tenant_id', $tenant->id)->findOrFail($branchId);

        if (!empty($data['is_main']) && !$branch->is_main) {
            Branch::where('tenant_id', $tenant->id)->update(['is_main' => false]);
        }

        $branch->update($data);

        return $branch;
    }

    /**
     * Delete a branch.
     */
    public function deleteBranch(Tenant $tenant, int $branchId): void
    {
        $branch = Branch::where('tenant_id', $tenant->id)->findOrFail($branchId);

        if ($branch->is_main) {
            throw ValidationException::withMessages([
                'branch' => 'Cabang utama (Central Kitchen) tidak boleh dihapus.',
            ]);
        }

        if ($branch->orders()->count() > 0) {
            throw ValidationException::withMessages([
                'branch' => 'Cabang memiliki riwayat pesanan aktif dan tidak dapat dihapus. Nonaktifkan status cabang sebagai alternatif.',
            ]);
        }

        $branch->delete();
    }
}
