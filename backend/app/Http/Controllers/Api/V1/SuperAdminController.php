<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\SuperAdminService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SuperAdminController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected SuperAdminService $superAdminService
    ) {}

    /**
     * Get Master SaaS Platform Overview & MRR Metrics.
     */
    public function metrics(): JsonResponse
    {
        $metrics = $this->superAdminService->getSaaSMetrics();

        return $this->successResponse($metrics, 'Metrik platform SaaS berhasil diambil.');
    }

    /**
     * List all tenants across the platform.
     */
    public function tenants(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $status = $request->query('status');
        $planSlug = $request->query('plan');
        $perPage = (int) $request->query('per_page', 15);

        $tenants = $this->superAdminService->listTenants($search, $status, $planSlug, $perPage);

        return $this->paginatedResponse($tenants, 'Daftar tenant katering berhasil diambil.');
    }

    /**
     * Suspend or Activate a tenant account.
     */
    public function updateTenantStatus(int $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $tenant = $this->superAdminService->updateTenantStatus($id, $validated['is_active']);

        $statusLabel = $tenant->is_active ? 'diaktifkan' : 'disuspend/dinonaktifkan';

        return $this->successResponse($tenant, "Akun tenant berhasil {$statusLabel}.");
    }

    /**
     * Assign or Change Subscription Plan for a tenant.
     */
    public function assignPlan(int $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subscription_plan_id' => ['required', 'integer', 'exists:subscription_plans,id'],
            'billing_cycle' => ['nullable', 'string', 'in:monthly,yearly'],
        ]);

        $subscription = $this->superAdminService->assignTenantPlan(
            $id,
            $validated['subscription_plan_id'],
            $validated['billing_cycle'] ?? 'monthly'
        );

        return $this->successResponse($subscription, 'Paket langganan tenant berhasil diperbarui.');
    }

    /**
     * List all available subscription plans.
     */
    public function plans(): JsonResponse
    {
        $plans = $this->superAdminService->listPlans();

        return $this->successResponse($plans, 'Daftar paket harga langganan berhasil diambil.');
    }

    /**
     * Update subscription plan configuration.
     */
    public function updatePlan(int $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'price_monthly' => ['sometimes', 'required', 'numeric', 'min:0'],
            'price_yearly' => ['sometimes', 'required', 'numeric', 'min:0'],
            'max_orders_per_month' => ['sometimes', 'required', 'integer', 'min:1'],
            'max_branches' => ['sometimes', 'required', 'integer', 'min:1'],
            'max_staff_users' => ['sometimes', 'required', 'integer', 'min:1'],
            'features' => ['nullable', 'array'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $plan = $this->superAdminService->updatePlan($id, $validated);

        return $this->successResponse($plan, 'Paket langganan berhasil diperbarui.');
    }
}
