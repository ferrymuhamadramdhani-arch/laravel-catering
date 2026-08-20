<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Courier;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourierController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $query = Courier::where('tenant_id', $tenant->id);

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('license_number', 'like', "%{$search}%");
            });
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->has('per_page') && $request->per_page > 0) {
            $couriers = $query->orderBy('name', 'asc')->paginate((int) $request->per_page);
            return $this->paginatedResponse($couriers, 'Daftar kurir berhasil diambil.');
        }

        $couriers = $query->orderBy('name', 'asc')->get();
        return $this->successResponse($couriers, 'Daftar kurir berhasil diambil.');
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'license_type' => ['nullable', 'string', 'max:50'],
            'license_number' => ['nullable', 'string', 'max:100'],
            'vehicle_type_preference' => ['nullable', 'in:motorcycle,car,van,truck'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $courier = Courier::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'license_type' => $validated['license_type'] ?? 'SIM C',
            'license_number' => $validated['license_number'] ?? null,
            'vehicle_type_preference' => $validated['vehicle_type_preference'] ?? 'motorcycle',
            'is_active' => $validated['is_active'] ?? true,
            'notes' => $validated['notes'] ?? null,
        ]);

        return $this->successResponse($courier, 'Kurir berhasil ditambahkan.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        $courier = Courier::where('tenant_id', $tenant->id)->findOrFail($id);

        return $this->successResponse($courier, 'Detail kurir berhasil diambil.');
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        $courier = Courier::where('tenant_id', $tenant->id)->findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['sometimes', 'required', 'string', 'max:30'],
            'license_type' => ['nullable', 'string', 'max:50'],
            'license_number' => ['nullable', 'string', 'max:100'],
            'vehicle_type_preference' => ['nullable', 'in:motorcycle,car,van,truck'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $courier->update($validated);

        return $this->successResponse($courier, 'Data kurir berhasil diperbarui.');
    }

    public function destroy(int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        $courier = Courier::where('tenant_id', $tenant->id)->findOrFail($id);

        $courier->delete();

        return $this->successResponse(null, 'Data kurir berhasil dihapus.');
    }
}
