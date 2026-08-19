<?php

namespace App\Services;

use App\Models\MenuItem;
use App\Models\MenuPackage;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class OrderService
{
    /**
     * State Machine mapping of allowed status transitions.
     */
    public const ALLOWED_TRANSITIONS = [
        'draft'         => ['confirmed', 'cancelled'],
        'confirmed'     => ['in_production', 'cancelled', 'draft'],
        'in_production' => ['ready', 'cancelled'],
        'ready'         => ['delivering', 'cancelled'],
        'delivering'    => ['delivered', 'cancelled'],
        'delivered'     => ['completed', 'delivering'],
        'completed'     => [],
        'cancelled'     => ['draft'], // Allow reopening as draft if cancelled by mistake
    ];

    /**
     * Generate unique sequential order number for a tenant: ORD-YYYYMMDD-XXXX
     */
    public function generateOrderNumber(int $tenantId, ?string $deliveryDate = null): string
    {
        $dateStr = $deliveryDate ? Carbon::parse($deliveryDate)->format('Ymd') : now()->format('Ymd');
        $prefix = "ORD-{$dateStr}-";

        $lastOrder = Order::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('order_number', 'like', "{$prefix}%")
            ->orderBy('order_number', 'desc')
            ->first();

        if ($lastOrder) {
            $lastSeq = (int) substr($lastOrder->order_number, -4);
            $nextSeq = str_pad((string)($lastSeq + 1), 4, '0', STR_PAD_LEFT);
        } else {
            $nextSeq = '0001';
        }

        return $prefix . $nextSeq;
    }

    /**
     * Validate if transition between order statuses is allowed.
     */
    public function canTransition(string $fromStatus, string $toStatus): bool
    {
        if ($fromStatus === $toStatus) {
            return true;
        }

        $allowed = self::ALLOWED_TRANSITIONS[$fromStatus] ?? [];
        return in_array($toStatus, $allowed, true);
    }

    /**
     * Transition order status and record audit trail history.
     */
    public function transitionStatus(
        Order $order,
        string $newStatus,
        ?int $userId = null,
        ?string $notes = null
    ): Order {
        if (!$this->canTransition($order->status, $newStatus)) {
            throw new \InvalidArgumentException(
                "Transisi status dari '{$order->status}' ke '{$newStatus}' tidak diizinkan dalam alur pesanan."
            );
        }

        $oldStatus = $order->status;

        DB::transaction(function () use ($order, $oldStatus, $newStatus, $userId, $notes) {
            $order->status = $newStatus;
            if ($newStatus === 'cancelled' && $notes) {
                $order->cancellation_reason = $notes;
            }
            $order->save();

            OrderStatusHistory::create([
                'order_id'    => $order->id,
                'from_status' => $oldStatus,
                'to_status'   => $newStatus,
                'changed_by'  => $userId,
                'notes'       => $notes,
            ]);
        });

        return $order->fresh(['statusHistories.user']);
    }

    /**
     * Process & snapshot items pricing, HPP, and calculate order totals.
     */
    public function processOrderItems(array $rawItems): array
    {
        $processedItems = [];
        $subtotalAmount = 0.0;
        $totalHpp = 0.0;

        foreach ($rawItems as $itemData) {
            $type = $itemData['item_type'] ?? 'menu_item';
            $qty = max(1, (int) ($itemData['quantity'] ?? 1));
            $unitPrice = 0.0;
            $unitHpp = 0.0;
            $itemName = $itemData['item_name'] ?? '';
            $portionUnit = $itemData['portion_unit'] ?? 'pax';
            $packageId = null;
            $menuItemId = null;

            if ($type === 'menu_package' && !empty($itemData['menu_package_id'])) {
                $package = MenuPackage::find($itemData['menu_package_id']);
                if ($package) {
                    $packageId = $package->id;
                    $itemName = $package->name;
                    $unitPrice = (float) $package->selling_price;
                    $unitHpp = (float) $package->calculated_hpp;
                    $portionUnit = 'box/pax';
                }
            } elseif ($type === 'menu_item' && !empty($itemData['menu_item_id'])) {
                $menu = MenuItem::find($itemData['menu_item_id']);
                if ($menu) {
                    $menuItemId = $menu->id;
                    $itemName = $menu->name;
                    $unitPrice = (float) $menu->selling_price;
                    $unitHpp = (float) $menu->calculated_hpp;
                    $portionUnit = $menu->portion_unit ?? 'porsi';
                }
            } else {
                // Custom item
                $type = 'custom';
                $unitPrice = (float) ($itemData['unit_price'] ?? 0);
                $unitHpp = (float) ($itemData['unit_hpp'] ?? 0);
                $portionUnit = $itemData['portion_unit'] ?? 'pax';
            }

            // Custom price override if provided
            if (isset($itemData['unit_price']) && (float) $itemData['unit_price'] > 0) {
                $unitPrice = (float) $itemData['unit_price'];
            }

            $subtotalPrice = $unitPrice * $qty;
            $subtotalItemHpp = $unitHpp * $qty;

            $subtotalAmount += $subtotalPrice;
            $totalHpp += $subtotalItemHpp;

            $processedItems[] = [
                'item_type'       => $type,
                'menu_package_id' => $packageId,
                'menu_item_id'    => $menuItemId,
                'item_name'       => $itemName,
                'unit_price'      => $unitPrice,
                'unit_hpp'        => $unitHpp,
                'quantity'        => $qty,
                'subtotal_price'  => $subtotalPrice,
                'subtotal_hpp'    => $subtotalItemHpp,
                'portion_unit'    => $portionUnit,
                'notes'           => $itemData['notes'] ?? null,
            ];
        }

        return [
            'items'           => $processedItems,
            'subtotal_amount' => $subtotalAmount,
            'total_hpp'       => $totalHpp,
        ];
    }

    /**
     * Compute total payable amount and payment status.
     */
    public function computeFinancials(
        float $subtotal,
        float $deliveryFee = 0,
        float $discount = 0,
        float $tax = 0,
        float $downPayment = 0
    ): array {
        $totalAmount = max(0, $subtotal + $deliveryFee + $tax - $discount);

        if ($downPayment <= 0) {
            $paymentStatus = 'unpaid';
        } elseif ($downPayment >= $totalAmount && $totalAmount > 0) {
            $paymentStatus = 'paid';
        } else {
            $paymentStatus = 'partially_paid';
        }

        return [
            'total_amount'   => $totalAmount,
            'payment_status' => $paymentStatus,
        ];
    }
}
