<?php

namespace App\Services;

use App\Models\MenuPackage;
use App\Models\MenuItem;
use App\Models\MenuRecipeBom;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductionPlan;
use App\Models\ProductionTask;
use App\Models\RawMaterial;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductionService
{
    public function __construct(
        protected InventoryService $inventoryService
    ) {}

    /**
     * Generate or synchronize daily production plan for a specific delivery date.
     */
    public function generateDailyPlan(Tenant $tenant, string $planDate, ?User $createdBy = null): array
    {
        return DB::transaction(function () use ($tenant, $planDate, $createdBy) {
            // 1. Fetch all confirmed/active orders for this date that have at least paid DP (down_payment, partially_paid, paid)
            $orders = Order::where('tenant_id', $tenant->id)
                ->whereDate('delivery_date', $planDate)
                ->whereIn('status', ['confirmed', 'processing', 'in_production', 'ready'])
                ->where(function ($q) {
                    $q->whereIn('payment_status', ['down_payment', 'partially_paid', 'paid'])
                      ->orWhere('total_amount', '<=', 0);
                })
                ->with(['items.menuItem.recipes.rawMaterial', 'items.menuPackage.items.menuItem.recipes.rawMaterial', 'customer'])
                ->get();

            $totalOrders = $orders->count();
            $totalPortions = 0;

            foreach ($orders as $order) {
                foreach ($order->items as $item) {
                    $totalPortions += (int) $item->quantity;
                }
            }

            // 2. Find or Create Production Plan
            $plan = ProductionPlan::firstOrNew([
                'tenant_id' => $tenant->id,
                'plan_date' => $planDate,
            ]);

            if (!$plan->exists) {
                $planCode = 'PROD-' . str_replace('-', '', $planDate) . '-' . strtoupper(Str::random(4));
                $plan->plan_code = $planCode;
                $plan->status = 'in_progress';
                $plan->created_by = $createdBy?->id;
            }

            $plan->total_orders = $totalOrders;
            $plan->total_portions = $totalPortions;
            $plan->save();

            // 3. Generate Task Checklist for each Order Item
            foreach ($orders as $order) {
                foreach ($order->items as $orderItem) {
                    // If Item is a Package (Bundling)
                    if ($orderItem->menu_package_id && $orderItem->menuPackage) {
                        // Create packing task for the package itself
                        ProductionTask::firstOrCreate([
                            'tenant_id' => $tenant->id,
                            'production_plan_id' => $plan->id,
                            'order_id' => $order->id,
                            'order_item_id' => $orderItem->id,
                            'menu_package_id' => $orderItem->menu_package_id,
                            'stage' => 'packing',
                        ], [
                            'item_name' => 'Packaging: ' . $orderItem->item_name,
                            'quantity' => $orderItem->quantity,
                            'portion_unit' => $orderItem->portion_unit ?? 'box',
                            'notes' => 'Kemas ' . $orderItem->quantity . ' ' . ($orderItem->portion_unit ?? 'box') . ' untuk Order #' . $order->order_number,
                        ]);

                        // Create cooking tasks for individual items inside package
                        foreach ($orderItem->menuPackage->items as $pkgItem) {
                            if ($pkgItem->menuItem) {
                                ProductionTask::firstOrCreate([
                                    'tenant_id' => $tenant->id,
                                    'production_plan_id' => $plan->id,
                                    'order_id' => $order->id,
                                    'order_item_id' => $orderItem->id,
                                    'menu_item_id' => $pkgItem->menu_item_id,
                                    'stage' => 'cooking',
                                ], [
                                    'item_name' => $pkgItem->menuItem->name . ' (Paket ' . $orderItem->item_name . ')',
                                    'quantity' => $orderItem->quantity,
                                    'portion_unit' => $pkgItem->menuItem->portion_unit ?? 'porsi',
                                    'notes' => 'Masak porsi untuk Order #' . $order->order_number,
                                ]);
                            }
                        }
                    } else {
                        // Direct Menu Item
                        ProductionTask::firstOrCreate([
                            'tenant_id' => $tenant->id,
                            'production_plan_id' => $plan->id,
                            'order_id' => $order->id,
                            'order_item_id' => $orderItem->id,
                            'menu_item_id' => $orderItem->menu_item_id,
                            'stage' => 'cooking',
                        ], [
                            'item_name' => $orderItem->item_name,
                            'quantity' => $orderItem->quantity,
                            'portion_unit' => $orderItem->portion_unit ?? 'porsi',
                            'notes' => 'Masak porsi untuk Order #' . $order->order_number,
                        ]);
                    }
                }
            }

            // 4. Calculate Aggregate Bill of Materials (BOM) Requirements
            $bomRequirements = $this->calculateBomRequirements($tenant, $orders);

            $tasks = ProductionTask::where('production_plan_id', $plan->id)
                ->with(['order', 'menuItem', 'menuPackage', 'assignee'])
                ->orderBy('id')
                ->get();

            return [
                'plan' => $plan,
                'total_orders' => $totalOrders,
                'total_portions' => $totalPortions,
                'bom_requirements' => $bomRequirements,
                'tasks' => $tasks,
            ];
        });
    }

    /**
     * Calculate aggregated BOM ingredient requirements for a list of orders.
     */
    public function calculateBomRequirements(Tenant $tenant, $orders): array
    {
        $materialRequirements = [];

        foreach ($orders as $order) {
            foreach ($order->items as $item) {
                $itemQty = (int) $item->quantity;

                if ($item->menu_package_id && $item->menuPackage) {
                    foreach ($item->menuPackage->items as $pkgItem) {
                        if ($pkgItem->menuItem) {
                            $this->aggregateMenuItemBom($pkgItem->menuItem, $itemQty, $materialRequirements);
                        }
                    }
                } elseif ($item->menu_item_id && $item->menuItem) {
                    $this->aggregateMenuItemBom($item->menuItem, $itemQty, $materialRequirements);
                }
            }
        }

        // Fetch current stock from raw materials table
        $materialIds = array_keys($materialRequirements);
        $rawMaterials = RawMaterial::where('tenant_id', $tenant->id)
            ->whereIn('id', $materialIds)
            ->get()
            ->keyBy('id');

        $results = [];
        foreach ($materialRequirements as $matId => $req) {
            $material = $rawMaterials->get($matId);
            $currentStock = $material ? (float) $material->current_stock : 0.0;
            $requiredQty = round($req['required_qty'], 3);
            $unit = $req['unit'];

            $status = 'sufficient';
            if ($currentStock <= 0) {
                $status = 'out_of_stock';
            } elseif ($currentStock < $requiredQty) {
                $status = 'low_stock';
            }

            $results[] = [
                'raw_material_id' => $matId,
                'name' => $req['name'],
                'category' => $material?->category ?? 'Bahan Baku',
                'unit' => $unit,
                'required_qty' => $requiredQty,
                'current_stock' => $currentStock,
                'difference' => round($currentStock - $requiredQty, 3),
                'status' => $status,
            ];
        }

        usort($results, fn($a, $b) => strcmp($a['name'], $b['name']));

        return $results;
    }

    /**
     * Helper to aggregate BOM items from a MenuItem.
     */
    protected function aggregateMenuItemBom(MenuItem $menuItem, int $portionMultiplier, array &$accumulator): void
    {
        foreach ($menuItem->recipes as $recipe) {
            $matId = $recipe->raw_material_id;
            $qtyNeeded = (float) $recipe->quantity * $portionMultiplier;
            $materialName = $recipe->rawMaterial?->name ?? ('Bahan #' . $matId);
            $unit = $recipe->unit ?? ($recipe->rawMaterial?->unit ?? 'kg');

            if (!isset($accumulator[$matId])) {
                $accumulator[$matId] = [
                    'name' => $materialName,
                    'unit' => $unit,
                    'required_qty' => 0.0,
                ];
            }

            $accumulator[$matId]['required_qty'] += $qtyNeeded;
        }
    }

    /**
     * Advance a task through stages: prep -> cooking -> packing -> qc -> completed.
     */
    public function advanceTaskStage(ProductionTask $task, string $newStage, ?User $user = null): ProductionTask
    {
        return DB::transaction(function () use ($task, $newStage, $user) {
            $validStages = ['prep', 'cooking', 'packing', 'qc', 'completed'];
            if (!in_array($newStage, $validStages)) {
                throw new \InvalidArgumentException("Tahapan produksi tidak valid: {$newStage}");
            }

            $task->stage = $newStage;
            if ($user) {
                $task->assigned_to = $user->id;
            }

            if ($newStage === 'cooking' && !$task->started_at) {
                $task->started_at = now();
            }

            if ($newStage === 'completed') {
                $task->completed_at = now();
            }

            $task->save();

            // Check if all tasks in plan are completed
            $incompleteTasksCount = ProductionTask::where('production_plan_id', $task->production_plan_id)
                ->where('stage', '!=', 'completed')
                ->count();

            if ($incompleteTasksCount === 0) {
                $plan = $task->plan;
                if ($plan && $plan->status !== 'completed') {
                    $plan->status = 'completed';
                    $plan->completed_at = now();
                    $plan->save();
                }
            }

            return $task->fresh(['assignee', 'order']);
        });
    }

    /**
     * Advance all tasks for a specific order to the new stage in one batch operation.
     */
    public function advanceOrderTasksStage(Tenant $tenant, int $planId, int $orderId, string $newStage, ?User $user = null): int
    {
        return DB::transaction(function () use ($tenant, $planId, $orderId, $newStage, $user) {
            $validStages = ['prep', 'cooking', 'packing', 'qc', 'completed'];
            if (!in_array($newStage, $validStages)) {
                throw new \InvalidArgumentException("Tahapan produksi tidak valid: {$newStage}");
            }

            $tasks = ProductionTask::where('tenant_id', $tenant->id)
                ->where('production_plan_id', $planId)
                ->where('order_id', $orderId)
                ->get();

            foreach ($tasks as $task) {
                $task->stage = $newStage;
                if ($user) {
                    $task->assigned_to = $user->id;
                }
                if ($newStage === 'cooking' && !$task->started_at) {
                    $task->started_at = now();
                }
                if ($newStage === 'completed') {
                    $task->completed_at = now();
                }
                $task->save();
            }

            // Check if all tasks in plan are completed
            $incompleteCount = ProductionTask::where('production_plan_id', $planId)
                ->where('stage', '!=', 'completed')
                ->count();

            if ($incompleteCount === 0) {
                $plan = ProductionPlan::find($planId);
                if ($plan && $plan->status !== 'completed') {
                    $plan->status = 'completed';
                    $plan->completed_at = now();
                    $plan->save();
                }
            }

            return $tasks->count();
        });
    }

    /**
     * Complete entire production plan & auto-deduct raw material inventory.
     */
    public function completePlanAndDeductInventory(ProductionPlan $plan, ?User $user = null): array
    {
        return DB::transaction(function () use ($plan, $user) {
            $tenant = $plan->tenant;

            // 1. Mark all tasks as completed
            ProductionTask::where('production_plan_id', $plan->id)
                ->update([
                    'stage' => 'completed',
                    'completed_at' => now(),
                ]);

            $plan->status = 'completed';
            $plan->completed_at = now();
            $plan->save();

            // 2. Fetch associated orders
            $orders = Order::where('tenant_id', $tenant->id)
                ->whereDate('delivery_date', $plan->plan_date)
                ->whereIn('status', ['draft', 'confirmed', 'processing', 'in_production'])
                ->with(['items.menuItem.recipes.rawMaterial', 'items.menuPackage.items.menuItem.recipes.rawMaterial'])
                ->get();

            // 3. Auto-deduct raw materials based on BOM requirements
            $bomRequirements = $this->calculateBomRequirements($tenant, $orders);
            $deductedItems = [];

            foreach ($bomRequirements as $req) {
                $material = RawMaterial::where('tenant_id', $tenant->id)->find($req['raw_material_id']);
                if ($material && $req['required_qty'] > 0) {
                    $ledger = $this->inventoryService->recordStockOut(
                        $tenant,
                        $material,
                        (float) $req['required_qty'],
                        "Pemakaian masak otomatis Rencana Produksi #{$plan->plan_code} ({$plan->plan_date->format('d/m/Y')})",
                        $user,
                        'production_plan',
                        $plan->id
                    );
                    $deductedItems[] = [
                        'material' => $material->name,
                        'deducted_qty' => $req['required_qty'],
                        'unit' => $req['unit'],
                        'stock_after' => $ledger->stock_after,
                    ];
                }
            }

            // 4. Update associated orders to 'ready'
            foreach ($orders as $order) {
                $order->status = 'ready';
                $order->save();
            }

            return [
                'plan' => $plan->fresh(),
                'orders_ready_count' => $orders->count(),
                'deducted_materials' => $deductedItems,
            ];
        });
    }

    /**
     * Generate thermal label / printable sticker data payload for an Order.
     */
    public function getProductionLabelData(Order $order): array
    {
        $order->loadMissing(['customer', 'items.menuItem', 'items.menuPackage', 'tenant']);

        $itemsSummary = [];
        foreach ($order->items as $it) {
            $itemsSummary[] = [
                'name' => $it->item_name,
                'quantity' => $it->quantity,
                'unit' => $it->portion_unit ?? 'porsi',
                'notes' => $it->notes,
            ];
        }

        return [
            'order_id' => $order->id,
            'order_number' => $order->order_number,
            'tracking_code' => $order->tracking_code ?? $order->order_number,
            'tenant_name' => $order->tenant->name,
            'customer_name' => $order->customer->name ?? $order->recipient_name ?? 'Pelanggan',
            'recipient_name' => $order->recipient_name ?? ($order->customer->name ?? 'Pelanggan'),
            'recipient_phone' => $order->recipient_phone ?? ($order->customer->phone ?? '—'),
            'delivery_address' => $order->delivery_address,
            'delivery_date' => $order->delivery_date->format('Y-m-d'),
            'delivery_time' => $order->delivery_time ? substr($order->delivery_time, 0, 5) : '11:30',
            'event_type' => $order->event_type,
            'event_name' => $order->event_name,
            'total_portions' => $order->total_portions ?? $order->items->sum('quantity'),
            'items' => $itemsSummary,
            'special_notes' => $order->notes,
            'printed_at' => now()->format('d/m/Y H:i:s'),
        ];
    }
}
