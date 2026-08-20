<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\ProductionPlan;
use App\Models\ProductionTask;
use App\Services\ProductionService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductionController extends Controller
{
    public function __construct(
        protected ProductionService $productionService,
        protected TenantContext $tenantContext
    ) {}

    /**
     * List production plans for the tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        $query = ProductionPlan::where('tenant_id', $tenant->id);

        if ($request->filled('start_date')) {
            $query->whereDate('plan_date', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->whereDate('plan_date', '<=', $request->end_date);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $plans = $query->orderBy('plan_date', 'desc')->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $plans,
        ]);
    }

    /**
     * Generate or synchronize daily production plan.
     */
    public function generate(Request $request): JsonResponse
    {
        $request->validate([
            'plan_date' => 'required|date',
        ]);

        $tenant = $this->tenantContext->getTenant();
        $user = $request->user();

        $result = $this->productionService->generateDailyPlan($tenant, $request->plan_date, $user);

        return response()->json([
            'success' => true,
            'message' => 'Rencana produksi harian berhasil disinkronisasi.',
            'data' => $result,
        ]);
    }

    /**
     * Get detail of a specific production plan.
     */
    public function show(int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        $plan = ProductionPlan::where('tenant_id', $tenant->id)->findOrFail($id);

        // Fetch associated orders for BOM calculation
        $orders = Order::where('tenant_id', $tenant->id)
            ->whereDate('delivery_date', $plan->plan_date)
            ->whereIn('status', ['draft', 'confirmed', 'processing', 'in_production', 'ready', 'completed'])
            ->with(['items.menuItem.recipes.rawMaterial', 'items.menuPackage.items.menuItem.recipes.rawMaterial'])
            ->get();

        $bomRequirements = $this->productionService->calculateBomRequirements($tenant, $orders);

        $tasks = ProductionTask::where('production_plan_id', $plan->id)
            ->with(['order.customer', 'menuItem', 'menuPackage', 'assignee'])
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'plan' => $plan,
                'bom_requirements' => $bomRequirements,
                'tasks' => $tasks,
                'orders_count' => $orders->count(),
            ],
        ]);
    }

    /**
     * Advance a production task stage.
     */
    public function updateTaskStage(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'stage' => 'required|in:prep,cooking,packing,qc,completed',
        ]);

        $tenant = $this->tenantContext->getTenant();
        $task = ProductionTask::where('tenant_id', $tenant->id)->findOrFail($id);
        $user = $request->user();

        $updatedTask = $this->productionService->advanceTaskStage($task, $request->stage, $user);

        return response()->json([
            'success' => true,
            'message' => "Tahapan pengerjaan berhasil diperbarui ke '{$request->stage}'.",
            'data' => $updatedTask,
        ]);
    }

    /**
     * Mark entire plan as completed & auto-deduct inventory.
     */
    public function completePlan(Request $request, int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        $plan = ProductionPlan::where('tenant_id', $tenant->id)->findOrFail($id);
        $user = $request->user();

        $result = $this->productionService->completePlanAndDeductInventory($plan, $user);

        return response()->json([
            'success' => true,
            'message' => 'Produksi selesai! Stok bahan baku berhasil dikurangi otomatis.',
            'data' => $result,
        ]);
    }

    /**
     * Get printable thermal label data for an order.
     */
    public function getOrderLabel(int $orderId): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        $order = Order::where('tenant_id', $tenant->id)->findOrFail($orderId);

        $labelData = $this->productionService->getProductionLabelData($order);

        return response()->json([
            'success' => true,
            'data' => $labelData,
        ]);
    }
}
