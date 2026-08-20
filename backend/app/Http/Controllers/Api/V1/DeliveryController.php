<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\Order;
use App\Services\DeliveryService;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DeliveryController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext,
        protected DeliveryService $deliveryService
    ) {}

    /**
     * List all deliveries for tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $query = Delivery::with(['order.customer', 'deliveryArea', 'proof', 'assignedByUser'])
            ->where('tenant_id', $tenant->id)
            ->orderBy('id', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('delivery_area_id') && $request->delivery_area_id !== 'all') {
            $query->where('delivery_area_id', $request->delivery_area_id);
        }

        if ($request->filled('date')) {
            $date = $request->date;
            $query->where(function ($q) use ($date) {
                $q->whereHas('order', function ($oq) use ($date) {
                    $oq->whereDate('delivery_date', $date)
                       ->orWhere('delivery_date', 'like', "{$date}%");
                })->orWhereDate('created_at', $date);
            });
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('delivery_number', 'like', "%{$search}%")
                  ->orWhere('courier_name', 'like', "%{$search}%")
                  ->orWhere('recipient_name', 'like', "%{$search}%")
                  ->orWhereHas('order', function ($oq) use ($search) {
                      $oq->where('order_number', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = (int) $request->input('per_page', 15);
        $paginated = $query->paginate($perPage);

        return $this->paginatedResponse($paginated, 'Daftar pengiriman berhasil diambil.');
    }

    /**
     * Get active deliveries for today / dispatch view.
     */
    public function today(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $date = $request->input('date');
        $courier = $request->input('courier_name');

        $result = $this->deliveryService->getTodayDeliveries($tenant, $date, $courier);

        return $this->successResponse($result, 'Data pengiriman hari ini berhasil diambil.');
    }

    /**
     * Assign courier to an order.
     */
    public function assign(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'order_id' => ['required', 'integer', 'exists:orders,id'],
            'courier_name' => ['required', 'string', 'max:100'],
            'courier_phone' => ['nullable', 'string', 'max:30'],
            'vehicle_type' => ['nullable', 'string', 'in:motorcycle,car,van,truck'],
            'vehicle_plate_number' => ['nullable', 'string', 'max:30'],
            'delivery_batch_code' => ['nullable', 'string', 'max:50'],
            'delivery_area_id' => ['nullable', 'integer', 'exists:delivery_areas,id'],
            'destination_address' => ['nullable', 'string'],
            'recipient_name' => ['nullable', 'string', 'max:100'],
            'recipient_phone' => ['nullable', 'string', 'max:30'],
            'delivery_time_target' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $order = Order::where('tenant_id', $tenant->id)->findOrFail($validated['order_id']);

        $delivery = $this->deliveryService->assignDelivery($tenant, $order, $validated, $request->user());

        return $this->successResponse($delivery, 'Kurir berhasil ditugaskan untuk pengiriman pesanan.', 201);
    }

    /**
     * Show detail of a delivery.
     */
    public function show(int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $delivery = Delivery::with(['order.customer', 'order.items.menuItem', 'order.items.menuPackage', 'deliveryArea', 'proof', 'assignedByUser'])
            ->where('tenant_id', $tenant->id)
            ->findOrFail($id);

        return $this->successResponse($delivery, 'Detail pengiriman berhasil diambil.');
    }

    /**
     * Update delivery status.
     */
    public function updateStatus(int $id, Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:assigned,dispatched,arrived,delivered,failed'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $delivery = Delivery::where('tenant_id', $tenant->id)->findOrFail($id);

        $updated = $this->deliveryService->updateDeliveryStatus(
            $delivery,
            $validated['status'],
            $validated['notes'] ?? null,
            $request->user()
        );

        return $this->successResponse($updated, "Status pengiriman berhasil diperbarui ke '{$validated['status']}'.");
    }

    /**
     * Submit Proof of Delivery (POD).
     */
    public function submitProof(int $id, Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'receiver_name' => ['required', 'string', 'max:100'],
            'photo' => ['nullable', 'image', 'max:5120'], // max 5MB
            'photo_url' => ['nullable', 'string'],
            'signature_data' => ['nullable', 'string'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'notes' => ['nullable', 'string', 'max:500'],
            'delivered_at' => ['nullable', 'date'],
        ]);

        $delivery = Delivery::where('tenant_id', $tenant->id)->findOrFail($id);

        // Handle uploaded file if present
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('delivery-proofs/' . $tenant->id, 'public');
            $validated['photo_url'] = Storage::url($path);
        }

        $proof = $this->deliveryService->submitProofOfDelivery($delivery, $validated, $request->user());

        return $this->successResponse($proof, 'Bukti penerimaan barang (POD) berhasil disimpan & pesanan selesai.');
    }

    /**
     * Batch synchronization of offline deliveries from Courier PWA.
     */
    public function syncOffline(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.delivery_id' => ['nullable', 'integer'],
            'records.*.order_id' => ['nullable', 'integer'],
            'records.*.status' => ['nullable', 'string', 'in:assigned,dispatched,arrived,delivered,failed'],
            'records.*.receiver_name' => ['nullable', 'string', 'max:100'],
            'records.*.signature_data' => ['nullable', 'string'],
            'records.*.photo_url' => ['nullable', 'string'],
            'records.*.notes' => ['nullable', 'string', 'max:500'],
            'records.*.delivered_at' => ['nullable', 'date'],
        ]);

        $result = $this->deliveryService->syncOfflineDeliveries($tenant, $validated['records'], $request->user());

        return $this->successResponse($result, 'Sinkronisasi data pengiriman offline selesai.');
    }
}
