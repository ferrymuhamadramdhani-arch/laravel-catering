<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Services\OrderService;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Modul Pemesanan (Order)', description: 'Endpoint Manajemen Pemesanan Katering (Order Lifecycle, Manual Entry, Calendar)')]
class OrderController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext,
        protected OrderService $orderService
    ) {}

    /**
     * Get paginated orders list with search, status, customer, and date filters.
     */
    #[OA\Get(
        path: '/tenant/orders',
        summary: 'Daftar Pesanan Katering',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Modul Pemesanan (Order)'],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'status', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'customer_id', in: 'query', required: false, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'start_date', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date')),
            new OA\Parameter(name: 'end_date', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date')),
            new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 10)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Daftar pesanan berhasil diambil'),
        ]
    )]
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $query = Order::with(['customer', 'items', 'deliveryArea'])
            ->orderBy('delivery_date', 'desc')
            ->orderBy('created_at', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('start_date')) {
            $query->whereDate('delivery_date', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->whereDate('delivery_date', '<=', $request->end_date);
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhere('event_name', 'like', "%{$search}%")
                  ->orWhere('recipient_name', 'like', "%{$search}%")
                  ->orWhereHas('customer', function ($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%")
                         ->orWhere('phone', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = (int) $request->input('per_page', 10);
        $paginated = $query->paginate($perPage);

        return $this->paginatedResponse($paginated, 'Daftar pesanan berhasil diambil.');
    }

    /**
     * Get monthly calendar aggregated orders.
     */
    #[OA\Get(
        path: '/tenant/orders/calendar',
        summary: 'Agregasi Kalender Pesanan Harian',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Modul Pemesanan (Order)'],
        parameters: [
            new OA\Parameter(name: 'month', in: 'query', required: false, schema: new OA\Schema(type: 'integer', example: 8)),
            new OA\Parameter(name: 'year', in: 'query', required: false, schema: new OA\Schema(type: 'integer', example: 2026)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Data kalender pesanan berhasil diambil'),
        ]
    )]
    public function calendar(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $month = (int) ($request->input('month', now()->month));
        $year = (int) ($request->input('year', now()->year));

        $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth()->toDateString();
        $endDate = Carbon::createFromDate($year, $month, 1)->endOfMonth()->toDateString();

        $orders = Order::with(['customer', 'items'])
            ->whereDate('delivery_date', '>=', $startDate)
            ->whereDate('delivery_date', '<=', $endDate)
            ->where('status', '!=', 'cancelled')
            ->orderBy('delivery_time', 'asc')
            ->get();

        // Group by delivery_date
        $grouped = $orders->groupBy(function ($o) {
            return Carbon::parse($o->delivery_date)->format('Y-m-d');
        });

        $calendarData = [];
        foreach ($grouped as $date => $dayOrders) {
            $totalPortions = 0;
            foreach ($dayOrders as $order) {
                foreach ($order->items as $item) {
                    $totalPortions += $item->quantity;
                }
            }

            $calendarData[$date] = [
                'date'           => $date,
                'total_orders'   => $dayOrders->count(),
                'total_portions' => $totalPortions,
                'orders'         => $dayOrders->map(fn($o) => [
                    'id'               => $o->id,
                    'order_number'     => $o->order_number,
                    'customer_name'    => $o->customer?->name,
                    'event_name'       => $o->event_name,
                    'event_type'       => $o->event_type,
                    'delivery_time'    => $o->delivery_time,
                    'status'           => $o->status,
                    'total_amount'     => $o->total_amount,
                    'items_count'      => $o->items->count(),
                    'total_pax'        => $o->items->sum('quantity'),
                ]),
            ];
        }

        return $this->successResponse([
            'month' => $month,
            'year'  => $year,
            'days'  => $calendarData,
        ], 'Data kalender pesanan berhasil diambil.');
    }

    /**
     * Store new manual order.
     */
    #[OA\Post(
        path: '/tenant/orders',
        summary: 'Buat Pesanan Katering Manual (Sales/CS)',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Modul Pemesanan (Order)'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['customer_id', 'delivery_date', 'items'],
                properties: [
                    new OA\Property(property: 'customer_id', type: 'integer', example: 1),
                    new OA\Property(property: 'event_name', type: 'string', example: 'Makan Siang Rapat Direksi PT. ABC'),
                    new OA\Property(property: 'event_type', type: 'string', example: 'Nasi Kotak'),
                    new OA\Property(property: 'delivery_date', type: 'string', format: 'date', example: '2026-08-25'),
                    new OA\Property(property: 'delivery_time', type: 'string', example: '11:30'),
                    new OA\Property(property: 'delivery_area_id', type: 'integer', nullable: true),
                    new OA\Property(property: 'delivery_address', type: 'string', example: 'Gedung Bursa Efek Tower 2 Lt. 15'),
                    new OA\Property(property: 'recipient_name', type: 'string', example: 'Ibu Sarah (HRD)'),
                    new OA\Property(property: 'recipient_phone', type: 'string', example: '081298765432'),
                    new OA\Property(property: 'delivery_fee', type: 'number', example: 35000),
                    new OA\Property(property: 'discount_amount', type: 'number', example: 0),
                    new OA\Property(property: 'tax_amount', type: 'number', example: 0),
                    new OA\Property(property: 'down_payment_amount', type: 'number', example: 500000),
                    new OA\Property(property: 'status', type: 'string', enum: ['draft', 'confirmed'], default: 'confirmed'),
                    new OA\Property(property: 'notes', type: 'string', example: 'Sajikan dengan sendok premium dan tisu'),
                    new OA\Property(
                        property: 'items',
                        type: 'array',
                        items: new OA\Items(
                            properties: [
                                new OA\Property(property: 'item_type', type: 'string', enum: ['menu_package', 'menu_item', 'custom']),
                                new OA\Property(property: 'menu_package_id', type: 'integer', nullable: true),
                                new OA\Property(property: 'menu_item_id', type: 'integer', nullable: true),
                                new OA\Property(property: 'quantity', type: 'integer', example: 50),
                                new OA\Property(property: 'unit_price', type: 'number', nullable: true),
                                new OA\Property(property: 'notes', type: 'string', example: '10 porsi tanpa sambal'),
                            ]
                        )
                    )
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Pesanan berhasil dibuat'),
            new OA\Response(response: 422, description: 'Validasi gagal'),
        ]
    )]
    public function store(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'customer_id'         => ['required', 'exists:customers,id'],
            'event_name'          => ['nullable', 'string', 'max:255'],
            'event_type'          => ['nullable', 'string', 'max:100'],
            'delivery_date'       => ['required', 'date'],
            'delivery_time'       => ['nullable', 'string'],
            'delivery_area_id'    => ['nullable', 'exists:delivery_areas,id'],
            'delivery_address'    => ['nullable', 'string', 'max:1000'],
            'recipient_name'      => ['nullable', 'string', 'max:255'],
            'recipient_phone'     => ['nullable', 'string', 'max:50'],
            'delivery_fee'        => ['nullable', 'numeric', 'min:0'],
            'discount_amount'     => ['nullable', 'numeric', 'min:0'],
            'tax_amount'          => ['nullable', 'numeric', 'min:0'],
            'down_payment_amount' => ['nullable', 'numeric', 'min:0'],
            'status'              => ['nullable', 'in:draft,confirmed'],
            'notes'               => ['nullable', 'string', 'max:1000'],
            'items'               => ['required', 'array', 'min:1'],
            'items.*.item_type'   => ['required', 'in:menu_package,menu_item,custom'],
            'items.*.menu_package_id' => ['nullable', 'exists:menu_packages,id'],
            'items.*.menu_item_id'    => ['nullable', 'exists:menu_items,id'],
            'items.*.item_name'       => ['nullable', 'string', 'max:255'],
            'items.*.quantity'        => ['required', 'integer', 'min:1'],
            'items.*.unit_price'      => ['nullable', 'numeric', 'min:0'],
            'items.*.notes'           => ['nullable', 'string', 'max:500'],
        ]);

        $orderNumber = $this->orderService->generateOrderNumber($tenant->id, $validated['delivery_date']);

        // Process items & financial amounts
        $processed = $this->orderService->processOrderItems($validated['items']);
        $subtotal = $processed['subtotal_amount'];
        $totalHpp = $processed['total_hpp'];
        $deliveryFee = (float) ($validated['delivery_fee'] ?? 0);
        $discount = (float) ($validated['discount_amount'] ?? 0);
        $tax = (float) ($validated['tax_amount'] ?? 0);
        $dp = (float) ($validated['down_payment_amount'] ?? 0);

        $financials = $this->orderService->computeFinancials($subtotal, $deliveryFee, $discount, $tax, $dp);
        $status = $validated['status'] ?? 'confirmed';

        $order = DB::transaction(function () use (
            $tenant,
            $validated,
            $orderNumber,
            $subtotal,
            $totalHpp,
            $deliveryFee,
            $discount,
            $tax,
            $dp,
            $financials,
            $status,
            $processed
        ) {
            $user = auth()->user();

            $order = Order::create([
                'tenant_id'           => $tenant->id,
                'customer_id'         => $validated['customer_id'],
                'order_number'        => $orderNumber,
                'event_name'          => $validated['event_name'] ?? null,
                'event_type'          => $validated['event_type'] ?? 'Nasi Kotak',
                'delivery_date'       => $validated['delivery_date'],
                'delivery_time'       => $validated['delivery_time'] ?? null,
                'delivery_area_id'    => $validated['delivery_area_id'] ?? null,
                'delivery_address'    => $validated['delivery_address'] ?? null,
                'recipient_name'      => $validated['recipient_name'] ?? null,
                'recipient_phone'     => $validated['recipient_phone'] ?? null,
                'subtotal_amount'     => $subtotal,
                'delivery_fee'        => $deliveryFee,
                'discount_amount'     => $discount,
                'tax_amount'          => $tax,
                'total_amount'        => $financials['total_amount'],
                'total_hpp'           => $totalHpp,
                'down_payment_amount' => $dp,
                'payment_status'      => $financials['payment_status'],
                'status'              => $status,
                'notes'               => $validated['notes'] ?? null,
                'created_by'          => $user?->id,
            ]);

            // Create items
            foreach ($processed['items'] as $item) {
                $order->items()->create($item);
            }

            // Create initial audit history
            OrderStatusHistory::create([
                'order_id'    => $order->id,
                'from_status' => null,
                'to_status'   => $status,
                'changed_by'  => $user?->id,
                'notes'       => 'Pesanan dibuat oleh ' . ($user?->name ?? 'Sales/CS'),
            ]);

            return $order;
        });

        return $this->successResponse(
            $order->load(['customer', 'items', 'deliveryArea', 'statusHistories.user']),
            'Pesanan berhasil dibuat.',
            201
        );
    }

    /**
     * Show detailed order info with audit histories.
     */
    #[OA\Get(
        path: '/tenant/orders/{id}',
        summary: 'Detail Pesanan & Timeline Status',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Modul Pemesanan (Order)'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Detail pesanan berhasil diambil'),
            new OA\Response(response: 404, description: 'Pesanan tidak ditemukan'),
        ]
    )]
    public function show(int $id): JsonResponse
    {
        $order = Order::with([
            'customer',
            'items.package',
            'items.menuItem',
            'deliveryArea',
            'creator',
            'statusHistories.user'
        ])->find($id);

        if (!$order) {
            return $this->errorResponse('Pesanan tidak ditemukan.', 404);
        }

        return $this->successResponse($order, 'Detail pesanan berhasil diambil.');
    }

    /**
     * Update order details (while in draft or confirmed status).
     */
    #[OA\Put(
        path: '/tenant/orders/{id}',
        summary: 'Update Pesanan Katering',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Modul Pemesanan (Order)'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Pesanan berhasil diperbarui'),
            new OA\Response(response: 400, description: 'Pesanan sedang dalam produksi tidak dapat diubah bebas'),
        ]
    )]
    public function update(Request $request, int $id): JsonResponse
    {
        $order = Order::with('items')->find($id);
        if (!$order) {
            return $this->errorResponse('Pesanan tidak ditemukan.', 404);
        }

        if (in_array($order->status, ['completed', 'cancelled'], true)) {
            return $this->errorResponse("Pesanan berstatus '{$order->status}' tidak dapat diubah.", 400);
        }

        $validated = $request->validate([
            'customer_id'         => ['sometimes', 'required', 'exists:customers,id'],
            'event_name'          => ['nullable', 'string', 'max:255'],
            'event_type'          => ['nullable', 'string', 'max:100'],
            'delivery_date'       => ['sometimes', 'required', 'date'],
            'delivery_time'       => ['nullable', 'string'],
            'delivery_area_id'    => ['nullable', 'exists:delivery_areas,id'],
            'delivery_address'    => ['nullable', 'string', 'max:1000'],
            'recipient_name'      => ['nullable', 'string', 'max:255'],
            'recipient_phone'     => ['nullable', 'string', 'max:50'],
            'delivery_fee'        => ['nullable', 'numeric', 'min:0'],
            'discount_amount'     => ['nullable', 'numeric', 'min:0'],
            'tax_amount'          => ['nullable', 'numeric', 'min:0'],
            'down_payment_amount' => ['nullable', 'numeric', 'min:0'],
            'notes'               => ['nullable', 'string', 'max:1000'],
            'items'               => ['nullable', 'array', 'min:1'],
            'items.*.item_type'   => ['required_with:items', 'in:menu_package,menu_item,custom'],
            'items.*.menu_package_id' => ['nullable', 'exists:menu_packages,id'],
            'items.*.menu_item_id'    => ['nullable', 'exists:menu_items,id'],
            'items.*.item_name'       => ['nullable', 'string', 'max:255'],
            'items.*.quantity'        => ['required_with:items', 'integer', 'min:1'],
            'items.*.unit_price'      => ['nullable', 'numeric', 'min:0'],
            'items.*.notes'           => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($order, $validated) {
            if (isset($validated['items'])) {
                $processed = $this->orderService->processOrderItems($validated['items']);
                $subtotal = $processed['subtotal_amount'];
                $totalHpp = $processed['total_hpp'];

                // Re-create items
                $order->items()->delete();
                foreach ($processed['items'] as $item) {
                    $order->items()->create($item);
                }

                $order->subtotal_amount = $subtotal;
                $order->total_hpp = $totalHpp;
            }

            if (isset($validated['delivery_fee'])) {
                $order->delivery_fee = $validated['delivery_fee'];
            }
            if (isset($validated['discount_amount'])) {
                $order->discount_amount = $validated['discount_amount'];
            }
            if (isset($validated['tax_amount'])) {
                $order->tax_amount = $validated['tax_amount'];
            }
            if (isset($validated['down_payment_amount'])) {
                $order->down_payment_amount = $validated['down_payment_amount'];
            }

            $financials = $this->orderService->computeFinancials(
                (float) $order->subtotal_amount,
                (float) $order->delivery_fee,
                (float) $order->discount_amount,
                (float) $order->tax_amount,
                (float) $order->down_payment_amount
            );

            $order->total_amount = $financials['total_amount'];
            $order->payment_status = $financials['payment_status'];

            // Update basic info
            $order->customer_id = $validated['customer_id'] ?? $order->customer_id;
            $order->event_name = $validated['event_name'] ?? $order->event_name;
            $order->event_type = $validated['event_type'] ?? $order->event_type;
            $order->delivery_date = $validated['delivery_date'] ?? $order->delivery_date;
            $order->delivery_time = $validated['delivery_time'] ?? $order->delivery_time;
            $order->delivery_area_id = $validated['delivery_area_id'] ?? $order->delivery_area_id;
            $order->delivery_address = $validated['delivery_address'] ?? $order->delivery_address;
            $order->recipient_name = $validated['recipient_name'] ?? $order->recipient_name;
            $order->recipient_phone = $validated['recipient_phone'] ?? $order->recipient_phone;
            $order->notes = $validated['notes'] ?? $order->notes;
            $order->save();
        });

        return $this->successResponse(
            $order->fresh(['customer', 'items', 'deliveryArea', 'statusHistories.user']),
            'Pesanan berhasil diperbarui.'
        );
    }

    /**
     * Transition order status via State Machine with audit trail.
     */
    #[OA\Patch(
        path: '/tenant/orders/{id}/status',
        summary: 'Ubah Status Pesanan (State Machine)',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Modul Pemesanan (Order)'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['status'],
                properties: [
                    new OA\Property(
                        property: 'status',
                        type: 'string',
                        enum: ['draft', 'confirmed', 'in_production', 'ready', 'delivering', 'delivered', 'completed', 'cancelled'],
                        example: 'in_production'
                    ),
                    new OA\Property(property: 'notes', type: 'string', example: 'Bahan telah disiapkan oleh gudang, koki mulai memasak'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Status pesanan berhasil diubah'),
            new OA\Response(response: 422, description: 'Transisi status tidak diizinkan'),
        ]
    )]
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $order = Order::find($id);
        if (!$order) {
            return $this->errorResponse('Pesanan tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'status' => [
                'required',
                'in:draft,confirmed,in_production,ready,delivering,delivered,completed,cancelled'
            ],
            'notes'  => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $user = auth()->user();
            $updatedOrder = $this->orderService->transitionStatus(
                $order,
                $validated['status'],
                $user?->id,
                $validated['notes'] ?? null
            );

            // If transitioned to delivering and no Delivery record exists yet, automatically create one
            if ($validated['status'] === 'delivering') {
                $tenant = $this->tenantContext->getTenant();
                if ($tenant && !$updatedOrder->delivery()->exists()) {
                    app(\App\Services\DeliveryService::class)->assignDelivery($tenant, $updatedOrder, [
                        'courier_name' => 'Driver Ekspedisi Katering',
                        'destination_address' => $updatedOrder->delivery_address,
                        'delivery_time_target' => $updatedOrder->delivery_time ?? '11:30',
                        'vehicle_type' => 'motorcycle',
                    ], $user);
                }
            }

            return $this->successResponse(
                $updatedOrder->load(['customer', 'items', 'deliveryArea', 'delivery']),
                "Status pesanan berhasil diperbarui menjadi '{$validated['status']}'."
            );
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Delete / Cancel order.
     */
    #[OA\Delete(
        path: '/tenant/orders/{id}',
        summary: 'Batalkan / Hapus Pesanan',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Modul Pemesanan (Order)'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Pesanan berhasil dihapus/dibatalkan'),
            new OA\Response(response: 400, description: 'Pesanan aktif tidak dapat dihapus permanen'),
        ]
    )]
    public function destroy(int $id): JsonResponse
    {
        $order = Order::find($id);
        if (!$order) {
            return $this->errorResponse('Pesanan tidak ditemukan.', 404);
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($order) {
            // Delete related deliveries & proofs
            foreach ($order->deliveries as $del) {
                $del->proof()?->delete();
                $del->delete();
            }
            if ($order->delivery) {
                $order->delivery->proof()?->delete();
                $order->delivery->delete();
            }

            // Delete related payments and invoices
            $order->payments()->delete();
            foreach ($order->invoices as $inv) {
                $inv->payments()->delete();
                $inv->delete();
            }

            // Delete production tasks
            $order->productionTasks()->delete();

            // Delete order items & status history
            $order->items()->delete();
            $order->statusHistories()->delete();

            // Delete the order itself
            $order->delete();
        });

        return $this->successResponse(null, 'Pesanan berhasil dihapus.');
    }
}
