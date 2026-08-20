<?php

namespace App\Services;

use App\Models\Delivery;
use App\Models\DeliveryProof;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DeliveryService
{
    /**
     * Generate unique delivery number: DEL-YYYYMMDD-0001
     */
    public function generateDeliveryNumber(Tenant $tenant): string
    {
        $datePrefix = 'DEL-' . date('Ymd') . '-';
        $latest = Delivery::where('tenant_id', $tenant->id)
            ->where('delivery_number', 'like', "{$datePrefix}%")
            ->orderBy('id', 'desc')
            ->first();

        $nextSeq = 1;
        if ($latest) {
            $parts = explode('-', $latest->delivery_number);
            $lastSeq = (int) end($parts);
            $nextSeq = $lastSeq + 1;
        }

        return $datePrefix . str_pad((string) $nextSeq, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Assign courier / create delivery for an order.
     */
    public function assignDelivery(Tenant $tenant, Order $order, array $data, ?User $user): Delivery
    {
        return DB::transaction(function () use ($tenant, $order, $data, $user) {
            $delivery = Delivery::firstOrNew([
                'tenant_id' => $tenant->id,
                'order_id' => $order->id,
            ]);

            if (!$delivery->exists) {
                $delivery->delivery_number = $this->generateDeliveryNumber($tenant);
                $delivery->status = 'assigned';
            }

            $delivery->delivery_batch_code = $data['delivery_batch_code'] ?? $delivery->delivery_batch_code;
            $delivery->delivery_area_id = $data['delivery_area_id'] ?? $order->delivery_area_id;
            $delivery->courier_name = $data['courier_name'];
            $delivery->courier_phone = $data['courier_phone'] ?? null;
            $delivery->vehicle_type = $data['vehicle_type'] ?? 'motorcycle';
            $delivery->vehicle_plate_number = $data['vehicle_plate_number'] ?? null;
            $delivery->destination_address = $data['destination_address'] ?? $order->delivery_address;
            $delivery->recipient_name = $data['recipient_name'] ?? ($order->recipient_name ?? $order->customer?->name);
            $delivery->recipient_phone = $data['recipient_phone'] ?? ($order->recipient_phone ?? $order->customer?->phone);
            $delivery->delivery_time_target = $data['delivery_time_target'] ?? ($order->delivery_time ?? '11:30');
            $delivery->notes = $data['notes'] ?? $delivery->notes;
            $delivery->assigned_by = $user?->id;
            $delivery->save();

            // Record status history
            OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => $order->status,
                'to_status' => $order->status,
                'notes' => "Kurir {$delivery->courier_name} ({$delivery->vehicle_type}) ditugaskan untuk pengiriman",
                'changed_by' => $user?->id,
            ]);

            return $delivery->load(['order.customer', 'deliveryArea', 'proof']);
        });
    }

    /**
     * Update delivery status (e.g. dispatched, arrived, failed).
     */
    public function updateDeliveryStatus(Delivery $delivery, string $status, ?string $notes, ?User $user): Delivery
    {
        return DB::transaction(function () use ($delivery, $status, $notes, $user) {
            $delivery->status = $status;
            if ($notes) {
                $delivery->notes = $notes;
            }

            $order = $delivery->order;

            if ($status === 'dispatched') {
                $delivery->dispatched_at = now();
                if ($order && in_array($order->status, ['confirmed', 'processing', 'ready'])) {
                    $oldStatus = $order->status;
                    $order->status = 'delivering';
                    $order->save();

                    OrderStatusHistory::create([
                        'order_id' => $order->id,
                        'from_status' => $oldStatus,
                        'to_status' => 'delivering',
                        'notes' => 'Pesanan berangkat menuju alamat tujuan bersama kurir ' . $delivery->courier_name,
                        'changed_by' => $user?->id,
                    ]);
                }
            } elseif ($status === 'delivered') {
                $delivery->delivered_at = now();
                if ($order && $order->status !== 'completed') {
                    $oldStatus = $order->status;
                    $order->status = 'completed';
                    $order->save();

                    OrderStatusHistory::create([
                        'order_id' => $order->id,
                        'from_status' => $oldStatus,
                        'to_status' => 'completed',
                        'notes' => 'Pesanan telah berhasil diterima di lokasi tujuan.',
                        'changed_by' => $user?->id,
                    ]);
                }
            }

            $delivery->save();

            return $delivery->fresh(['order.customer', 'deliveryArea', 'proof']);
        });
    }

    /**
     * Submit Proof of Delivery (POD) with photo & digital signature.
     */
    public function submitProofOfDelivery(Delivery $delivery, array $proofData, ?User $user): DeliveryProof
    {
        return DB::transaction(function () use ($delivery, $proofData, $user) {
            $tenant = $delivery->tenant;
            $order = $delivery->order;

            $proof = DeliveryProof::firstOrNew([
                'tenant_id' => $tenant->id,
                'delivery_id' => $delivery->id,
            ]);

            $proof->order_id = $delivery->order_id;
            $proof->receiver_name = $proofData['receiver_name'];
            $proof->photo_url = $proofData['photo_url'] ?? $proof->photo_url;
            $proof->signature_data = $proofData['signature_data'] ?? $proof->signature_data;
            $proof->latitude = $proofData['latitude'] ?? null;
            $proof->longitude = $proofData['longitude'] ?? null;
            $proof->notes = $proofData['notes'] ?? null;
            $proof->delivered_at = $proofData['delivered_at'] ?? now();
            $proof->save();

            // Mark delivery delivered
            $delivery->status = 'delivered';
            $delivery->delivered_at = $proof->delivered_at;
            $delivery->save();

            // Mark order completed
            if ($order && $order->status !== 'completed') {
                $oldStatus = $order->status;
                $order->status = 'completed';
                $order->save();

                OrderStatusHistory::create([
                    'order_id' => $order->id,
                    'from_status' => $oldStatus,
                    'to_status' => 'completed',
                    'notes' => "Pesanan diterima oleh {$proof->receiver_name} (Bukti POD tersimpan)",
                    'changed_by' => $user?->id,
                ]);
            }

            return $proof->load(['delivery', 'order']);
        });
    }

    /**
     * Batch synchronization of offline deliveries from courier PWA app.
     */
    public function syncOfflineDeliveries(Tenant $tenant, array $offlineRecords, ?User $user): array
    {
        $synced = [];
        $errors = [];

        foreach ($offlineRecords as $rec) {
            try {
                $deliveryId = $rec['delivery_id'] ?? null;
                $orderId = $rec['order_id'] ?? null;

                $delivery = null;
                if ($deliveryId) {
                    $delivery = Delivery::where('tenant_id', $tenant->id)->find($deliveryId);
                } elseif ($orderId) {
                    $delivery = Delivery::where('tenant_id', $tenant->id)->where('order_id', $orderId)->first();
                }

                if (!$delivery) {
                    $errors[] = [
                        'record' => $rec,
                        'error' => 'Data pengiriman tidak ditemukan.',
                    ];
                    continue;
                }

                // If proof of delivery data is present
                if (!empty($rec['receiver_name'])) {
                    $proof = $this->submitProofOfDelivery($delivery, $rec, $user);
                    $synced[] = [
                        'delivery_id' => $delivery->id,
                        'order_id' => $delivery->order_id,
                        'status' => 'delivered',
                        'proof_id' => $proof->id,
                    ];
                } elseif (!empty($rec['status'])) {
                    $updated = $this->updateDeliveryStatus($delivery, $rec['status'], $rec['notes'] ?? null, $user);
                    $synced[] = [
                        'delivery_id' => $delivery->id,
                        'order_id' => $delivery->order_id,
                        'status' => $updated->status,
                    ];
                }
            } catch (\Exception $e) {
                $errors[] = [
                    'record' => $rec,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return [
            'synced_count' => count($synced),
            'synced' => $synced,
            'errors_count' => count($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Get active deliveries for today (for courier dispatch view).
     */
    public function getTodayDeliveries(Tenant $tenant, ?string $date = null, ?string $courierName = null): array
    {
        $targetDate = $date ?? now()->toDateString();

        $query = Delivery::where('tenant_id', $tenant->id)
            ->whereHas('order', function ($q) use ($targetDate) {
                $q->whereDate('delivery_date', $targetDate);
            })
            ->with(['order.customer', 'order.items.menuItem', 'order.items.menuPackage', 'deliveryArea', 'proof'])
            ->orderBy('delivery_time_target', 'asc');

        if ($courierName) {
            $query->where('courier_name', 'like', "%{$courierName}%");
        }

        $deliveries = $query->get();

        // Also fetch orders for today that do not have a courier assigned yet
        $unassignedOrders = Order::where('tenant_id', $tenant->id)
            ->whereDate('delivery_date', $targetDate)
            ->whereIn('status', ['draft', 'confirmed', 'processing', 'in_production', 'ready'])
            ->whereDoesntHave('delivery')
            ->with(['customer', 'deliveryArea', 'items'])
            ->get();

        return [
            'date' => $targetDate,
            'total_deliveries' => $deliveries->count(),
            'unassigned_orders_count' => $unassignedOrders->count(),
            'deliveries' => $deliveries,
            'unassigned_orders' => $unassignedOrders,
        ];
    }
}
