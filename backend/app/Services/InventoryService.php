<?php

namespace App\Services;

use App\Models\RawMaterial;
use App\Models\StockLedger;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    public function __construct(
        protected HppCalculatorService $hppCalculator
    ) {}

    /**
     * Record stock incoming (Penerimaan / Belanja Bahan Baku).
     */
    public function recordStockIn(
        Tenant $tenant,
        RawMaterial $material,
        float $quantity,
        ?float $unitPrice = null,
        ?string $notes = null,
        ?User $user = null,
        string $referenceType = 'purchase_receipt',
        ?int $referenceId = null
    ): StockLedger {
        return DB::transaction(function () use (
            $tenant,
            $material,
            $quantity,
            $unitPrice,
            $notes,
            $user,
            $referenceType,
            $referenceId
        ) {
            $stockBefore = (float) $material->current_stock;
            $stockAfter = $stockBefore + $quantity;

            $priceChanged = false;
            if ($unitPrice !== null && $unitPrice > 0 && (float) $material->default_purchase_price !== $unitPrice) {
                $material->default_purchase_price = $unitPrice;
                $priceChanged = true;
            }

            $material->current_stock = $stockAfter;
            $material->save();

            // Auto recalculate menu HPP if price updated
            if ($priceChanged) {
                $this->hppCalculator->recalculateForRawMaterial($material->id);
            }

            $effectiveUnitCost = $unitPrice ?? (float) $material->default_purchase_price;
            $totalCost = $effectiveUnitCost > 0 ? ($effectiveUnitCost * $quantity) : null;

            return StockLedger::create([
                'tenant_id' => $tenant->id,
                'raw_material_id' => $material->id,
                'type' => 'in',
                'quantity' => $quantity,
                'stock_before' => $stockBefore,
                'stock_after' => $stockAfter,
                'unit_cost' => $effectiveUnitCost,
                'total_cost' => $totalCost,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'notes' => $notes,
                'created_by' => $user?->id,
            ]);
        });
    }

    /**
     * Record stock outgoing (Pemakaian Masak / Bahan Rusak / Kadaluarsa).
     */
    public function recordStockOut(
        Tenant $tenant,
        RawMaterial $material,
        float $quantity,
        ?string $notes = null,
        ?User $user = null,
        string $referenceType = 'waste_damage',
        ?int $referenceId = null
    ): StockLedger {
        return DB::transaction(function () use (
            $tenant,
            $material,
            $quantity,
            $notes,
            $user,
            $referenceType,
            $referenceId
        ) {
            $stockBefore = (float) $material->current_stock;
            $stockAfter = max(0, $stockBefore - $quantity);

            $material->current_stock = $stockAfter;
            $material->save();

            $unitCost = (float) $material->default_purchase_price;
            $totalCost = $unitCost > 0 ? ($unitCost * $quantity) : null;

            return StockLedger::create([
                'tenant_id' => $tenant->id,
                'raw_material_id' => $material->id,
                'type' => 'out',
                'quantity' => $quantity,
                'stock_before' => $stockBefore,
                'stock_after' => $stockAfter,
                'unit_cost' => $unitCost,
                'total_cost' => $totalCost,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'notes' => $notes,
                'created_by' => $user?->id,
            ]);
        });
    }

    /**
     * Record physical stock opname adjustment (Penyesuaian Selisih Fisik).
     */
    public function recordStockAdjustment(
        Tenant $tenant,
        RawMaterial $material,
        float $physicalStock,
        ?string $notes = null,
        ?User $user = null
    ): StockLedger {
        return DB::transaction(function () use (
            $tenant,
            $material,
            $physicalStock,
            $notes,
            $user
        ) {
            $stockBefore = (float) $material->current_stock;
            $stockAfter = $physicalStock;
            $difference = $physicalStock - $stockBefore;

            $material->current_stock = $stockAfter;
            $material->save();

            $unitCost = (float) $material->default_purchase_price;
            $diffQuantity = abs($difference);
            $totalCost = $unitCost > 0 ? ($unitCost * $diffQuantity) : null;

            $diffLabel = $difference >= 0 ? "+{$diffQuantity}" : "-{$diffQuantity}";
            $autoNote = "Opname fisik: selisih {$diffLabel} {$material->unit} (Sistem: {$stockBefore} → Fisik: {$physicalStock})";
            if (!empty($notes)) {
                $autoNote .= ". Ket: {$notes}";
            }

            return StockLedger::create([
                'tenant_id' => $tenant->id,
                'raw_material_id' => $material->id,
                'type' => 'adjustment',
                'quantity' => $diffQuantity,
                'stock_before' => $stockBefore,
                'stock_after' => $stockAfter,
                'unit_cost' => $unitCost,
                'total_cost' => $totalCost,
                'reference_type' => 'stock_opname',
                'reference_id' => null,
                'notes' => $autoNote,
                'created_by' => $user?->id,
            ]);
        });
    }

    /**
     * Aggregate inventory metrics for dashboard & alerts.
     */
    public function getInventorySummary(Tenant $tenant): array
    {
        $materials = RawMaterial::where('tenant_id', $tenant->id)->get();

        $totalItems = $materials->count();
        $totalValuation = 0.0;
        $safeCount = 0;
        $lowStockCount = 0;
        $outOfStockCount = 0;

        foreach ($materials as $m) {
            $current = (float) $m->current_stock;
            $min = (float) $m->minimum_stock;
            $price = (float) $m->default_purchase_price;

            $totalValuation += ($current * $price);

            if ($current <= 0) {
                $outOfStockCount++;
            } elseif ($current <= $min) {
                $lowStockCount++;
            } else {
                $safeCount++;
            }
        }

        return [
            'total_items' => $totalItems,
            'total_valuation' => $totalValuation,
            'safe_items_count' => $safeCount,
            'low_stock_count' => $lowStockCount,
            'out_of_stock_count' => $outOfStockCount,
        ];
    }
}
