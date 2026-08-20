<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\DeliveryArea;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\MenuPackage;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Tenant;
use App\Services\FinanceService;
use App\Services\HppCalculatorService;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Public Customer Portal', description: 'Endpoint Publik Portal Pemesanan & Tracking Pelanggan')]
class PublicCustomerPortalController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected HppCalculatorService $hppCalculator,
        protected FinanceService $financeService
    ) {}

    /**
     * Resolve Tenant by slug or tenant ID.
     */
    protected function resolveTenant(string $identifier): ?Tenant
    {
        return Tenant::where(function ($q) use ($identifier) {
            $q->where('slug', $identifier);
            if (is_numeric($identifier)) {
                $q->orWhere('id', (int) $identifier);
            }
        })->where('is_active', true)->first();
    }

    /**
     * Get tenant public catalog (Branding, Categories, Packages, Menu Items, Delivery Areas).
     */
    public function catalog(string $slug): JsonResponse
    {
        $tenant = $this->resolveTenant($slug);
        if (!$tenant) {
            return $this->errorResponse('Katering tidak ditemukan atau tidak aktif.', 404);
        }

        $categories = MenuCategory::where('tenant_id', $tenant->id)
            ->orderBy('sort_order', 'asc')
            ->get();

        $menuPackages = MenuPackage::with(['items.menuItem'])
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->orderBy('id', 'asc')
            ->get();

        $menuItems = MenuItem::with(['category'])
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->get();

        $deliveryAreas = DeliveryArea::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->orderBy('delivery_fee', 'asc')
            ->get();

        $data = [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'logo_url' => $tenant->logo_url,
                'phone' => $tenant->phone,
                'email' => $tenant->email,
                'address' => $tenant->address,
                'description' => $tenant->description,
                'bank_accounts' => $tenant->bank_accounts,
            ],
            'categories' => $categories,
            'packages' => $menuPackages,
            'menu_items' => $menuItems,
            'delivery_areas' => $deliveryAreas,
        ];

        return $this->successResponse($data, 'Katalog menu berhasil dimuat.');
    }

    /**
     * Check kitchen capacity on chosen delivery date.
     */
    public function checkCapacity(Request $request, string $slug): JsonResponse
    {
        $tenant = $this->resolveTenant($slug);
        if (!$tenant) {
            return $this->errorResponse('Katering tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'delivery_date' => 'required|date|after_or_equal:today',
        ]);

        $dateStr = Carbon::parse($validated['delivery_date'])->toDateString();

        // Calculate existing portions booked on this date
        $existingOrders = Order::with('items')
            ->where('tenant_id', $tenant->id)
            ->whereDate('delivery_date', $dateStr)
            ->where('status', '!=', 'cancelled')
            ->get();

        $currentBookedPortions = (int) $existingOrders->sum(function ($ord) {
            return $ord->items->sum('quantity');
        });

        $maxCapacity = 1000; // Default capacity per day
        $availableSlots = max(0, $maxCapacity - $currentBookedPortions);
        $isAvailable = $availableSlots > 0;

        return $this->successResponse([
            'date' => $dateStr,
            'is_available' => $isAvailable,
            'current_booked_portions' => $currentBookedPortions,
            'max_capacity' => $maxCapacity,
            'available_slots' => $availableSlots,
        ], 'Pengecekan ketersediaan tanggal berhasil.');
    }

    /**
     * Public self-service checkout for customers.
     */
    public function checkout(Request $request, string $slug): JsonResponse
    {
        $tenant = $this->resolveTenant($slug);
        if (!$tenant) {
            return $this->errorResponse('Katering tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'customer_name' => 'required|string|max:150',
            'customer_phone' => 'required|string|max:30',
            'customer_email' => 'nullable|email|max:100',
            'event_name' => 'nullable|string|max:150',
            'event_type' => 'required|string|max:50',
            'delivery_date' => 'required|date|after_or_equal:today',
            'delivery_time' => 'nullable|string|max:10',
            'delivery_area_id' => 'nullable|exists:delivery_areas,id',
            'delivery_address' => 'required|string|max:500',
            'recipient_name' => 'nullable|string|max:100',
            'recipient_phone' => 'nullable|string|max:30',
            'items' => 'required|array|min:1',
            'items.*.item_type' => 'required|in:menu_package,menu_item',
            'items.*.item_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.notes' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ]);

        return DB::transaction(function () use ($tenant, $validated, $request) {
            // 1. Find or create customer
            $customer = Customer::firstOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'phone' => trim($validated['customer_phone']),
                ],
                [
                    'name' => trim($validated['customer_name']),
                    'email' => $validated['customer_email'] ?? null,
                    'address' => $validated['delivery_address'],
                    'type' => 'individual',
                    'is_active' => true,
                ]
            );

            // 2. Generate Tracking Code & Order Number
            $trackingCode = 'TRK-' . strtoupper(Str::random(4)) . '-' . rand(1000, 9999);
            $yearMonth = Carbon::now()->format('Ym');
            $lastOrder = Order::where('tenant_id', $tenant->id)
                ->where('order_number', 'like', "ORD-{$yearMonth}-%")
                ->orderBy('id', 'desc')
                ->lockForUpdate()
                ->first();

            $seq = 1;
            if ($lastOrder && preg_match('/ORD-\d{6}-(\d+)/', $lastOrder->order_number, $matches)) {
                $seq = (int) $matches[1] + 1;
            }
            $orderNumber = sprintf('ORD-%s-%04d', $yearMonth, $seq);

            // 3. Process Delivery Area & Fee
            $deliveryFee = 0;
            if (!empty($validated['delivery_area_id'])) {
                $area = DeliveryArea::where('tenant_id', $tenant->id)->find($validated['delivery_area_id']);
                if ($area) {
                    $deliveryFee = (float) $area->delivery_fee;
                }
            }

            // 4. Calculate Items Subtotal & HPP
            $subtotalAmount = 0;
            $totalHpp = 0;
            $orderItemsData = [];

            foreach ($validated['items'] as $itemInput) {
                if ($itemInput['item_type'] === 'menu_package') {
                    $package = MenuPackage::where('tenant_id', $tenant->id)->find($itemInput['item_id']);
                    if (!$package) continue;

                    $unitPrice = (float) ($package->selling_price ?? $package->price ?? 0);
                    $unitHpp = (float) ($package->calculated_hpp ?? 0);
                    $subtotal = $unitPrice * $itemInput['quantity'];
                    $subtotalHpp = $unitHpp * $itemInput['quantity'];

                    $subtotalAmount += $subtotal;
                    $totalHpp += $subtotalHpp;

                    $orderItemsData[] = [
                        'item_type' => 'menu_package',
                        'menu_package_id' => $package->id,
                        'menu_item_id' => null,
                        'item_name' => $package->name,
                        'unit_price' => $unitPrice,
                        'unit_hpp' => $unitHpp,
                        'quantity' => $itemInput['quantity'],
                        'subtotal_price' => $subtotal,
                        'subtotal_hpp' => $subtotalHpp,
                        'portion_unit' => $package->portion_unit ?? 'box',
                        'notes' => $itemInput['notes'] ?? null,
                    ];
                } else {
                    $menuItem = MenuItem::where('tenant_id', $tenant->id)->find($itemInput['item_id']);
                    if (!$menuItem) continue;

                    $unitPrice = (float) $menuItem->selling_price;
                    $unitHpp = (float) ($menuItem->calculated_hpp ?? 0);
                    $subtotal = $unitPrice * $itemInput['quantity'];
                    $subtotalHpp = $unitHpp * $itemInput['quantity'];

                    $subtotalAmount += $subtotal;
                    $totalHpp += $subtotalHpp;

                    $orderItemsData[] = [
                        'item_type' => 'menu_item',
                        'menu_package_id' => null,
                        'menu_item_id' => $menuItem->id,
                        'item_name' => $menuItem->name,
                        'unit_price' => $unitPrice,
                        'unit_hpp' => $unitHpp,
                        'quantity' => $itemInput['quantity'],
                        'subtotal_price' => $subtotal,
                        'subtotal_hpp' => $subtotalHpp,
                        'portion_unit' => $menuItem->portion_unit ?? 'porsi',
                        'notes' => $itemInput['notes'] ?? null,
                    ];
                }
            }

            $totalAmount = $subtotalAmount + $deliveryFee;

            // 5. Create Order
            $order = Order::create([
                'tenant_id' => $tenant->id,
                'customer_id' => $customer->id,
                'order_number' => $orderNumber,
                'tracking_code' => $trackingCode,
                'event_name' => $validated['event_name'] ?? 'Pesanan Online (' . $validated['event_type'] . ')',
                'event_type' => $validated['event_type'],
                'delivery_date' => $validated['delivery_date'],
                'delivery_time' => $validated['delivery_time'] ?? '11:30',
                'delivery_area_id' => $validated['delivery_area_id'] ?? null,
                'delivery_address' => $validated['delivery_address'],
                'recipient_name' => $validated['recipient_name'] ?? $validated['customer_name'],
                'recipient_phone' => $validated['recipient_phone'] ?? $validated['customer_phone'],
                'subtotal_amount' => $subtotalAmount,
                'delivery_fee' => $deliveryFee,
                'discount_amount' => 0,
                'tax_amount' => 0,
                'total_amount' => $totalAmount,
                'total_hpp' => $totalHpp,
                'down_payment_amount' => 0,
                'payment_status' => 'unpaid',
                'status' => 'confirmed',
                'notes' => $validated['notes'] ?? null,
                'customer_ip' => $request->ip(),
            ]);

            // 6. Create Order Items
            foreach ($orderItemsData as $itemData) {
                $itemData['order_id'] = $order->id;
                OrderItem::create($itemData);
            }

            // 7. Auto-create Invoice
            $invoice = $this->financeService->createInvoiceForOrder($order, [
                'invoice_type' => 'full',
                'notes' => 'Faktur diterbitkan otomatis dari pemesanan mandiri via Customer Portal',
            ]);

            $order->load(['customer', 'items', 'deliveryArea']);

            return $this->successResponse([
                'order' => $order,
                'tracking_code' => $trackingCode,
                'invoice' => $invoice,
                'bank_accounts' => $tenant->bank_accounts,
            ], 'Pesanan Anda berhasil dibuat dan diteruskan ke katering!', 201);
        });
    }

    /**
     * Public Order Tracking Endpoint.
     */
    public function trackOrder(string $trackingNumber): JsonResponse
    {
        $trackingNumber = trim($trackingNumber);

        $order = Order::with([
            'tenant',
            'customer',
            'items',
            'deliveryArea',
            'delivery.proof',
            'statusHistories',
            'invoices.payments',
        ])
        ->where(function ($q) use ($trackingNumber) {
            $q->where('tracking_code', $trackingNumber)
              ->orWhere('order_number', $trackingNumber);
        })
        ->first();

        if (!$order) {
            return $this->errorResponse('Pesanan atau nomor resi tracking tidak ditemukan.', 404);
        }

        return $this->successResponse($order, 'Status pelacakan pesanan berhasil dimuat.');
    }
}
