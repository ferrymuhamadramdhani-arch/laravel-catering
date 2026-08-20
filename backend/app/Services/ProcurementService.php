<?php

namespace App\Services;

use App\Models\GoodsReceipt;
use App\Models\GoodsReceiptItem;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\RawMaterial;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ProcurementService
{
    public function __construct(
        protected InventoryService $inventoryService
    ) {}

    /**
     * Generate unique PO Number: PO-YYYYMMDD-0001
     */
    public function generatePoNumber(Tenant $tenant): string
    {
        $datePrefix = 'PO-' . date('Ymd') . '-';
        $latestPo = PurchaseOrder::where('tenant_id', $tenant->id)
            ->where('po_number', 'like', "{$datePrefix}%")
            ->orderBy('id', 'desc')
            ->first();

        $nextSeq = 1;
        if ($latestPo) {
            $parts = explode('-', $latestPo->po_number);
            $lastSeq = (int) end($parts);
            $nextSeq = $lastSeq + 1;
        }

        return $datePrefix . str_pad((string) $nextSeq, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Generate unique Goods Receipt Number: GR-YYYYMMDD-0001
     */
    public function generateReceiptNumber(Tenant $tenant): string
    {
        $datePrefix = 'GR-' . date('Ymd') . '-';
        $latest = GoodsReceipt::where('tenant_id', $tenant->id)
            ->where('receipt_number', 'like', "{$datePrefix}%")
            ->orderBy('id', 'desc')
            ->first();

        $nextSeq = 1;
        if ($latest) {
            $parts = explode('-', $latest->receipt_number);
            $lastSeq = (int) end($parts);
            $nextSeq = $lastSeq + 1;
        }

        return $datePrefix . str_pad((string) $nextSeq, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Create a new Purchase Order.
     */
    public function createPurchaseOrder(Tenant $tenant, array $data, ?User $user): PurchaseOrder
    {
        return DB::transaction(function () use ($tenant, $data, $user) {
            $poNumber = $this->generatePoNumber($tenant);

            $totalAmount = 0.0;
            $itemsData = [];

            foreach ($data['items'] as $item) {
                $qty = (float) $item['quantity_ordered'];
                $price = (float) $item['unit_price'];
                $subtotal = $qty * $price;
                $totalAmount += $subtotal;

                $itemsData[] = [
                    'raw_material_id' => $item['raw_material_id'],
                    'quantity_ordered' => $qty,
                    'quantity_received' => 0,
                    'unit_price' => $price,
                    'subtotal' => $subtotal,
                    'notes' => $item['notes'] ?? null,
                ];
            }

            $po = PurchaseOrder::create([
                'tenant_id' => $tenant->id,
                'po_number' => $poNumber,
                'supplier_id' => $data['supplier_id'] ?? null,
                'status' => 'draft',
                'order_date' => $data['order_date'] ?? now()->toDateString(),
                'expected_delivery_date' => $data['expected_delivery_date'] ?? null,
                'total_amount' => $totalAmount,
                'notes' => $data['notes'] ?? null,
                'created_by' => $user?->id,
            ]);

            foreach ($itemsData as $item) {
                $po->items()->create($item);
            }

            return $po->load(['items.rawMaterial', 'supplier', 'creator']);
        });
    }

    /**
     * Approve Purchase Order & Auto-Generate Draft Goods Receipt (Stock-In Draft).
     */
    public function approvePurchaseOrder(PurchaseOrder $po, User $user): GoodsReceipt
    {
        return DB::transaction(function () use ($po, $user) {
            $po->status = 'approved';
            $po->approved_by = $user->id;
            $po->approved_at = now();
            $po->save();

            $receiptNumber = $this->generateReceiptNumber($po->tenant);

            $goodsReceipt = GoodsReceipt::create([
                'tenant_id' => $po->tenant_id,
                'receipt_number' => $receiptNumber,
                'purchase_order_id' => $po->id,
                'supplier_id' => $po->supplier_id,
                'status' => 'draft', // Menunggu barang fisik tiba
                'received_date' => null,
                'notes' => "Draft penerimaan otomatis dari PO #{$po->po_number}",
                'received_by' => null,
            ]);

            foreach ($po->items as $poItem) {
                GoodsReceiptItem::create([
                    'goods_receipt_id' => $goodsReceipt->id,
                    'raw_material_id' => $poItem->raw_material_id,
                    'purchase_order_item_id' => $poItem->id,
                    'quantity_expected' => $poItem->quantity_ordered,
                    'quantity_received' => 0,
                    'unit_cost' => $poItem->unit_price,
                    'total_cost' => $poItem->subtotal,
                    'notes' => $poItem->notes,
                ]);
            }

            return $goodsReceipt->load(['items.rawMaterial', 'purchaseOrder', 'supplier']);
        });
    }

    /**
     * Confirm / Process Physical Goods Receipt in Warehouse.
     * Increases actual stock in warehouse, logs StockLedger, and marks PO as Completed.
     */
    public function processGoodsReceipt(
        GoodsReceipt $receipt,
        array $receivedItemsMap,
        ?string $notes,
        User $user
    ): GoodsReceipt {
        return DB::transaction(function () use ($receipt, $receivedItemsMap, $notes, $user) {
            $receipt->load(['items.rawMaterial', 'items.purchaseOrderItem', 'purchaseOrder.items', 'tenant']);

            $totalReceiptCost = 0.0;

            foreach ($receipt->items as $item) {
                $materialId = $item->raw_material_id;
                $input = $receivedItemsMap[$item->id] ?? $receivedItemsMap[$materialId] ?? null;

                $receivedQty = $input !== null ? (float) ($input['quantity_received'] ?? $item->quantity_expected) : (float) $item->quantity_expected;
                $unitCost = $input !== null && isset($input['unit_cost']) ? (float) $input['unit_cost'] : (float) $item->unit_cost;
                $itemTotalCost = $receivedQty * $unitCost;
                $totalReceiptCost += $itemTotalCost;

                $item->quantity_received = $receivedQty;
                $item->unit_cost = $unitCost;
                $item->total_cost = $itemTotalCost;
                if (isset($input['notes'])) {
                    $item->notes = $input['notes'];
                }
                $item->save();

                // Update PO item received quantity
                if ($item->purchaseOrderItem) {
                    $item->purchaseOrderItem->quantity_received = (float) $item->purchaseOrderItem->quantity_received + $receivedQty;
                    $item->purchaseOrderItem->save();
                }

                // If quantity received > 0, record real stock in into warehouse!
                if ($receivedQty > 0) {
                    $material = RawMaterial::where('tenant_id', $receipt->tenant_id)->find($materialId);
                    if ($material) {
                        $poNumber = $receipt->purchaseOrder?->po_number ?? 'NON-PO';
                        $ledgerNotes = "Penerimaan PO #{$poNumber} (Receipt #{$receipt->receipt_number})";
                        if (!empty($notes)) {
                            $ledgerNotes .= " - {$notes}";
                        }

                        $this->inventoryService->recordStockIn(
                            $receipt->tenant,
                            $material,
                            $receivedQty,
                            $unitCost,
                            $ledgerNotes,
                            $user,
                            'purchase_receipt',
                            $receipt->purchase_order_id
                        );
                    }
                }
            }

            // Update Goods Receipt status
            $receipt->status = 'received';
            $receipt->received_date = now();
            $receipt->received_by = $user->id;
            if (!empty($notes)) {
                $receipt->notes = $notes;
            }
            $receipt->save();

            // Update PO Status (completed vs partially_received)
            if ($receipt->purchaseOrder) {
                $po = $receipt->purchaseOrder->fresh(['items']);
                $allCompleted = true;
                $hasAnyReceived = false;

                foreach ($po->items as $poItem) {
                    if ((float) $poItem->quantity_received >= (float) $poItem->quantity_ordered) {
                        $hasAnyReceived = true;
                    } else {
                        $allCompleted = false;
                        if ((float) $poItem->quantity_received > 0) {
                            $hasAnyReceived = true;
                        }
                    }
                }

                if ($allCompleted) {
                    $po->status = 'completed';
                } elseif ($hasAnyReceived) {
                    $po->status = 'partially_received';
                }
                $po->save();
            }

            return $receipt->load(['items.rawMaterial', 'purchaseOrder', 'supplier', 'receiver']);
        });
    }

    /**
     * Auto-suggest Purchase Orders based on formula:
     * (Kebutuhan Bahan dari Order/Produksi + Minimum Stok) - Stok Gudang Saat Ini
     */
    public function autoSuggestPurchaseOrders(Tenant $tenant, ?string $targetDate = null): array
    {
        $date = $targetDate ?? now()->addDay()->toDateString();

        // 1. Fetch confirmed/processing orders for the date range
        $orders = \App\Models\Order::where('tenant_id', $tenant->id)
            ->whereDate('delivery_date', '>=', now()->toDateString())
            ->whereDate('delivery_date', '<=', $date)
            ->whereIn('status', ['confirmed', 'processing'])
            ->with(['items.menuItem.recipes.rawMaterial', 'items.menuPackage.items.menuItem.recipes.rawMaterial'])
            ->get();

        // 2. Aggregate BOM requirement
        $productionService = app(ProductionService::class);
        $bomRequirements = $productionService->calculateBomRequirements($tenant, $orders);
        $bomMap = collect($bomRequirements)->keyBy('raw_material_id');

        // 3. Fetch all raw materials
        $materials = RawMaterial::where('tenant_id', $tenant->id)
            ->with(['supplier'])
            ->get();

        $supplierGroups = [];
        $totalItemsNeeded = 0;
        $totalEstimatedCost = 0.0;

        foreach ($materials as $material) {
            $currentStock = (float) $material->current_stock;
            $minStock = (float) $material->minimum_stock;
            $bomReq = $bomMap->get($material->id);
            $requiredForProduction = $bomReq ? (float) $bomReq['required_qty'] : 0.0;

            // Suggested Order Quantity Formula:
            // (Kebutuhan Produksi + Minimum Stok) - Stok Saat Ini
            $shortage = ($requiredForProduction + $minStock) - $currentStock;

            if ($shortage > 0) {
                $totalItemsNeeded++;
                $suggestedQty = ceil($shortage * 10) / 10; // round up to 1 decimal
                $unitPrice = (float) $material->default_purchase_price;
                $estimatedSubtotal = $suggestedQty * $unitPrice;
                $totalEstimatedCost += $estimatedSubtotal;

                $supplierId = $material->supplier_id ?? 0;
                $supplierName = $material->supplier?->name ?? 'Supplier Umum / Belum Ditugaskan';

                if (!isset($supplierGroups[$supplierId])) {
                    $supplierGroups[$supplierId] = [
                        'supplier_id' => $material->supplier_id,
                        'supplier_name' => $supplierName,
                        'supplier_phone' => $material->supplier?->phone,
                        'supplier_email' => $material->supplier?->email,
                        'items' => [],
                        'total_estimated_amount' => 0.0,
                    ];
                }

                $supplierGroups[$supplierId]['items'][] = [
                    'raw_material_id' => $material->id,
                    'material_name' => $material->name,
                    'material_code' => $material->code,
                    'category' => $material->category,
                    'unit' => $material->unit,
                    'current_stock' => $currentStock,
                    'min_stock' => $minStock,
                    'required_for_production' => $requiredForProduction,
                    'suggested_quantity' => $suggestedQty,
                    'unit_price' => $unitPrice,
                    'estimated_subtotal' => $estimatedSubtotal,
                ];

                $supplierGroups[$supplierId]['total_estimated_amount'] += $estimatedSubtotal;
            }
        }

        return [
            'target_date' => $date,
            'total_shortage_items' => $totalItemsNeeded,
            'total_estimated_cost' => $totalEstimatedCost,
            'suggestions_by_supplier' => array_values($supplierGroups),
        ];
    }

    /**
     * Create multiple draft Purchase Orders from selected suggestions.
     */
    public function createPurchaseOrdersFromSuggestions(
        Tenant $tenant,
        array $selectedSuggestions,
        ?User $user
    ): array {
        return DB::transaction(function () use ($tenant, $selectedSuggestions, $user) {
            $createdPos = [];

            foreach ($selectedSuggestions as $group) {
                if (empty($group['items'])) continue;

                $poData = [
                    'supplier_id' => $group['supplier_id'] ?? null,
                    'order_date' => now()->toDateString(),
                    'expected_delivery_date' => now()->addDays(2)->toDateString(),
                    'notes' => 'Draft PO otomatis dibuat dari sistem rekomendasi pengadaan (Auto-Suggest PO)',
                    'items' => array_map(function ($it) {
                        return [
                            'raw_material_id' => $it['raw_material_id'],
                            'quantity_ordered' => $it['suggested_quantity'] ?? $it['quantity_ordered'],
                            'unit_price' => $it['unit_price'],
                            'notes' => 'Auto-suggest PO',
                        ];
                    }, $group['items']),
                ];

                $po = $this->createPurchaseOrder($tenant, $poData, $user);
                $createdPos[] = $po;
            }

            return $createdPos;
        });
    }

    /**
     * Get price history trend for raw materials.
     */
    public function getMaterialPriceHistory(Tenant $tenant, ?int $rawMaterialId = null): array
    {
        $query = \App\Models\StockLedger::where('tenant_id', $tenant->id)
            ->where('type', 'in')
            ->whereNotNull('unit_cost')
            ->where('unit_cost', '>', 0)
            ->with(['rawMaterial'])
            ->orderBy('created_at', 'desc')
            ->limit(50);

        if ($rawMaterialId) {
            $query->where('raw_material_id', $rawMaterialId);
        }

        return $query->get()->map(function ($ledger) {
            return [
                'id' => $ledger->id,
                'raw_material_id' => $ledger->raw_material_id,
                'material_name' => $ledger->rawMaterial?->name,
                'unit' => $ledger->rawMaterial?->unit,
                'purchase_date' => $ledger->created_at->format('Y-m-d H:i'),
                'unit_cost' => (float) $ledger->unit_cost,
                'quantity' => (float) $ledger->quantity,
                'total_cost' => (float) $ledger->total_cost,
                'notes' => $ledger->notes,
            ];
        })->toArray();
    }
}
