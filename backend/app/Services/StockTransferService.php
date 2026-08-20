<?php

namespace App\Services;

use App\Models\RawMaterial;
use App\Models\StockLedger;
use App\Models\StockTransfer;
use App\Models\StockTransferItem;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class StockTransferService
{
    /**
     * Create a new inter-branch stock transfer request.
     */
    public function createTransfer(Tenant $tenant, User $user, array $data): StockTransfer
    {
        if ($data['from_branch_id'] === $data['to_branch_id']) {
            throw ValidationException::withMessages([
                'to_branch_id' => 'Cabang tujuan tidak boleh sama dengan cabang asal.',
            ]);
        }

        if (empty($data['items']) || !is_array($data['items'])) {
            throw ValidationException::withMessages([
                'items' => 'Minimal harus ada satu bahan baku untuk ditransfer.',
            ]);
        }

        return DB::transaction(function () use ($tenant, $user, $data) {
            $transferNumber = 'TRF-' . date('Ymd') . '-' . strtoupper(Str::random(5));

            $transfer = StockTransfer::create([
                'tenant_id' => $tenant->id,
                'transfer_number' => $transferNumber,
                'from_branch_id' => $data['from_branch_id'],
                'to_branch_id' => $data['to_branch_id'],
                'status' => 'pending',
                'notes' => $data['notes'] ?? null,
                'created_by' => $user->id,
            ]);

            foreach ($data['items'] as $item) {
                StockTransferItem::create([
                    'stock_transfer_id' => $transfer->id,
                    'raw_material_id' => $item['raw_material_id'],
                    'quantity' => $item['quantity'],
                    'unit' => $item['unit'] ?? 'kg',
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            return $transfer->load(['fromBranch', 'toBranch', 'items.rawMaterial', 'creator']);
        });
    }

    /**
     * Dispatch / Ship stock transfer (Deducts stock from Origin Branch).
     */
    public function shipTransfer(Tenant $tenant, int $transferId, User $user): StockTransfer
    {
        $transfer = StockTransfer::where('tenant_id', $tenant->id)
            ->with(['items.rawMaterial', 'fromBranch', 'toBranch'])
            ->findOrFail($transferId);

        if ($transfer->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => 'Transfer hanya dapat dikirim jika berstatus Pending.',
            ]);
        }

        return DB::transaction(function () use ($transfer, $user) {
            foreach ($transfer->items as $item) {
                $material = $item->rawMaterial;
                $qty = (float) $item->quantity;

                // Deduct stock
                $stockBefore = (float) ($material->current_stock ?? 0);
                $stockAfter = max(0, $stockBefore - $qty);
                $material->update(['current_stock' => $stockAfter]);
                $unitCost = (float) ($material->default_purchase_price ?? 0);

                // Create Stock Ledger Out
                StockLedger::create([
                    'tenant_id' => $transfer->tenant_id,
                    'branch_id' => $transfer->from_branch_id,
                    'raw_material_id' => $material->id,
                    'type' => 'out',
                    'quantity' => $qty,
                    'stock_before' => $stockBefore,
                    'stock_after' => $stockAfter,
                    'unit_cost' => $unitCost,
                    'total_cost' => $unitCost * $qty,
                    'reference_type' => 'stock_transfer_out',
                    'reference_id' => $transfer->id,
                    'notes' => "Mutasi Keluar ke {$transfer->toBranch->name} (#{$transfer->transfer_number})",
                    'created_by' => $user->id,
                ]);
            }

            $transfer->update([
                'status' => 'in_transit',
                'transferred_at' => now(),
            ]);

            return $transfer->fresh(['fromBranch', 'toBranch', 'items.rawMaterial', 'creator']);
        });
    }

    /**
     * Confirm receipt of stock transfer at destination branch (Adds stock).
     */
    public function receiveTransfer(Tenant $tenant, int $transferId, User $user): StockTransfer
    {
        $transfer = StockTransfer::where('tenant_id', $tenant->id)
            ->with(['items.rawMaterial', 'fromBranch', 'toBranch'])
            ->findOrFail($transferId);

        if ($transfer->status !== 'in_transit') {
            throw ValidationException::withMessages([
                'status' => 'Penerimaan hanya dapat dikonfirmasi untuk transfer yang berstatus Dalam Perjalanan (In-Transit).',
            ]);
        }

        return DB::transaction(function () use ($transfer, $user) {
            foreach ($transfer->items as $item) {
                $material = $item->rawMaterial;
                $qty = (float) $item->quantity;

                // Add stock
                $stockBefore = (float) ($material->current_stock ?? 0);
                $stockAfter = $stockBefore + $qty;
                $material->update(['current_stock' => $stockAfter]);
                $unitCost = (float) ($material->default_purchase_price ?? 0);

                // Create Stock Ledger In
                StockLedger::create([
                    'tenant_id' => $transfer->tenant_id,
                    'branch_id' => $transfer->to_branch_id,
                    'raw_material_id' => $material->id,
                    'type' => 'in',
                    'quantity' => $qty,
                    'stock_before' => $stockBefore,
                    'stock_after' => $stockAfter,
                    'unit_cost' => $unitCost,
                    'total_cost' => $unitCost * $qty,
                    'reference_type' => 'stock_transfer_in',
                    'reference_id' => $transfer->id,
                    'notes' => "Mutasi Masuk dari {$transfer->fromBranch->name} (#{$transfer->transfer_number})",
                    'created_by' => $user->id,
                ]);
            }

            $transfer->update([
                'status' => 'completed',
                'received_by' => $user->id,
                'received_at' => now(),
            ]);

            return $transfer->fresh(['fromBranch', 'toBranch', 'items.rawMaterial', 'creator', 'receiver']);
        });
    }

    /**
     * Cancel a pending transfer.
     */
    public function cancelTransfer(Tenant $tenant, int $transferId, User $user): StockTransfer
    {
        $transfer = StockTransfer::where('tenant_id', $tenant->id)
            ->with(['items.rawMaterial', 'fromBranch', 'toBranch'])
            ->findOrFail($transferId);

        if ($transfer->status === 'completed') {
            throw ValidationException::withMessages([
                'status' => 'Transfer yang sudah selesai tidak dapat dibatalkan.',
            ]);
        }

        return DB::transaction(function () use ($transfer, $user) {
            // If it was in_transit, restore the deducted stock
            if ($transfer->status === 'in_transit') {
                foreach ($transfer->items as $item) {
                    $material = $item->rawMaterial;
                    $qty = (float) $item->quantity;
                    $stockBefore = (float) ($material->current_stock ?? 0);
                    $stockAfter = $stockBefore + $qty;
                    $material->update(['current_stock' => $stockAfter]);
                    $unitCost = (float) ($material->default_purchase_price ?? 0);

                    StockLedger::create([
                        'tenant_id' => $transfer->tenant_id,
                        'raw_material_id' => $material->id,
                        'type' => 'in',
                        'quantity' => $qty,
                        'stock_before' => $stockBefore,
                        'stock_after' => $stockAfter,
                        'unit_cost' => $unitCost,
                        'total_cost' => $unitCost * $qty,
                        'reference_type' => 'stock_transfer_cancelled',
                        'reference_id' => $transfer->id,
                        'notes' => "Pengembalian stok pembatalan mutasi (#{$transfer->transfer_number})",
                        'created_by' => $user->id,
                    ]);
                }
            }

            $transfer->update(['status' => 'cancelled']);

            return $transfer->fresh(['fromBranch', 'toBranch', 'items.rawMaterial']);
        });
    }
}
