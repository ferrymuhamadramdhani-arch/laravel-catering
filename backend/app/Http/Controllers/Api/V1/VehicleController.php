<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VehicleController extends Controller
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

        $query = Vehicle::where('tenant_id', $tenant->id);

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('license_plate', 'like', "%{$search}%");
            });
        }

        if ($request->filled('vehicle_type') && $request->vehicle_type !== 'all') {
            $query->where('vehicle_type', $request->vehicle_type);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->has('per_page') && $request->per_page > 0) {
            $vehicles = $query->orderBy('name', 'asc')->paginate((int) $request->per_page);
            return $this->paginatedResponse($vehicles, 'Daftar armada kendaraan berhasil diambil.');
        }

        $vehicles = $query->orderBy('name', 'asc')->get();
        return $this->successResponse($vehicles, 'Daftar armada kendaraan berhasil diambil.');
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'vehicle_type' => ['required', 'in:motorcycle,car,van,truck'],
            'license_plate' => ['required', 'string', 'max:50'],
            'max_capacity_box' => ['nullable', 'integer', 'min:1'],
            'condition_status' => ['nullable', 'in:good,maintenance,repairing'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $vehicle = Vehicle::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'vehicle_type' => $validated['vehicle_type'],
            'license_plate' => strtoupper(trim($validated['license_plate'])),
            'max_capacity_box' => $validated['max_capacity_box'] ?? 100,
            'condition_status' => $validated['condition_status'] ?? 'good',
            'is_active' => $validated['is_active'] ?? true,
            'notes' => $validated['notes'] ?? null,
        ]);

        return $this->successResponse($vehicle, 'Armada kendaraan berhasil ditambahkan.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        $vehicle = Vehicle::where('tenant_id', $tenant->id)->findOrFail($id);

        return $this->successResponse($vehicle, 'Detail armada kendaraan berhasil diambil.');
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        $vehicle = Vehicle::where('tenant_id', $tenant->id)->findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'vehicle_type' => ['sometimes', 'required', 'in:motorcycle,car,van,truck'],
            'license_plate' => ['sometimes', 'required', 'string', 'max:50'],
            'max_capacity_box' => ['nullable', 'integer', 'min:1'],
            'condition_status' => ['nullable', 'in:good,maintenance,repairing'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if (isset($validated['license_plate'])) {
            $validated['license_plate'] = strtoupper(trim($validated['license_plate']));
        }

        $vehicle->update($validated);

        return $this->successResponse($vehicle, 'Data armada kendaraan berhasil diperbarui.');
    }

    public function destroy(int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        $vehicle = Vehicle::where('tenant_id', $tenant->id)->findOrFail($id);

        $vehicle->delete();

        return $this->successResponse(null, 'Data armada kendaraan berhasil dihapus.');
    }
}
