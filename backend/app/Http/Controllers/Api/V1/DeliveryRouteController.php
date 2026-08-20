<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\DeliveryRouteOptimizationService;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeliveryRouteController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext,
        protected DeliveryRouteOptimizationService $routeService
    ) {}

    /**
     * Get optimized route and multi-stop directions.
     */
    public function optimize(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $date = $request->query('date', now()->toDateString());
        $branchId = $request->query('branch_id') ? (int) $request->query('branch_id') : null;

        $result = $this->routeService->getOptimizedRoute($tenant, $date, $branchId);

        return $this->successResponse($result, 'Optimasi urutan rute pengiriman berhasil dihitung.');
    }

    /**
     * Batch assign deliveries to a courier.
     */
    public function batchAssign(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'delivery_ids' => ['required', 'array', 'min:1'],
            'delivery_ids.*' => ['required', 'integer', 'exists:deliveries,id'],
            'courier_user_id' => ['required', 'integer', 'exists:users,id'],
            'vehicle_type' => ['nullable', 'string', 'in:motorcycle,car,van,truck'],
            'vehicle_license_plate' => ['nullable', 'string', 'max:20'],
        ]);

        $deliveries = $this->routeService->batchAssignCourier(
            $tenant,
            $validated['delivery_ids'],
            $validated['courier_user_id'],
            $validated['vehicle_type'] ?? 'motorcycle',
            $validated['vehicle_license_plate'] ?? null
        );

        return $this->successResponse($deliveries, 'Rute pengiriman berhasil ditugaskan ke kurir.');
    }

    /**
     * Get courier daily itinerary.
     */
    public function courierSchedule(int $courierId, Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $date = $request->query('date', now()->toDateString());
        $itinerary = $this->routeService->getCourierDailyItinerary($tenant, $courierId, $date);

        return $this->successResponse($itinerary, 'Jadwal rute kurir berhasil diambil.');
    }
}
