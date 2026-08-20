<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PurchaseOrder;
use App\Models\RawMaterial;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Dashboard', description: 'Endpoint Agregasi Metrik Dashboard & Operasional')]
class DashboardController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    /**
     * Get aggregated metrics for tenant dashboard.
     */
    #[OA\Get(
        path: '/tenant/dashboard/metrics',
        summary: 'Metrik Dashboard Ringkas Real-Time',
        security: [['bearerAuth' => []], ['TenantHeader' => []]],
        tags: ['Dashboard'],
        responses: [
            new OA\Response(response: 200, description: 'Metrik dashboard berhasil diambil'),
        ]
    )]
    public function metrics(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();
        $todayStr = $now->toDateString();

        // 1. Revenue & Receivables Metrics
        $revenueThisMonth = (float) Payment::where('tenant_id', $tenant->id)
            ->where('status', 'confirmed')
            ->whereBetween('payment_date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
            ->sum('amount');

        $totalReceivables = (float) Invoice::where('tenant_id', $tenant->id)
            ->whereIn('status', ['unpaid', 'partially_paid'])
            ->sum('remaining_amount');

        $totalInvoicesCount = Invoice::where('tenant_id', $tenant->id)->count();
        $paidInvoicesCount = Invoice::where('tenant_id', $tenant->id)->where('status', 'paid')->count();

        // 2. Orders Metrics
        $activeOrdersQuery = Order::where('tenant_id', $tenant->id)
            ->whereIn('status', ['confirmed', 'in_production', 'ready', 'delivering']);
        $activeOrdersCount = (int) $activeOrdersQuery->count();

        $todayOrders = Order::with(['customer', 'items', 'deliveryArea'])
            ->where('tenant_id', $tenant->id)
            ->where(function ($q) use ($todayStr) {
                $q->whereDate('delivery_date', $todayStr)
                  ->orWhere('delivery_date', 'like', "{$todayStr}%");
            })
            ->where('status', '!=', 'cancelled')
            ->orderBy('delivery_time', 'asc')
            ->get();

        $todayOrdersCount = $todayOrders->count();
        $todayPortionsCount = (int) $todayOrders->sum(function ($order) {
            return $order->items->sum('quantity');
        });

        $completedOrdersThisMonth = Order::where('tenant_id', $tenant->id)
            ->where('status', 'completed')
            ->whereBetween('delivery_date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
            ->count();

        // 3. Inventory & Procurement Metrics
        $rawMaterials = RawMaterial::where('tenant_id', $tenant->id)->get();
        $lowStockItems = $rawMaterials->filter(function ($mat) {
            return (float) $mat->current_stock <= (float) $mat->minimum_stock;
        })->values();

        $lowStockMaterialsCount = $lowStockItems->count();

        $pendingPoCount = PurchaseOrder::where('tenant_id', $tenant->id)
            ->whereIn('status', ['draft', 'approved'])
            ->count();

        // 4. Priority / Upcoming Orders (Today & Next 7 Days)
        $priorityOrders = Order::with(['customer', 'items', 'deliveryArea'])
            ->where('tenant_id', $tenant->id)
            ->where('delivery_date', '>=', $todayStr)
            ->where('status', '!=', 'cancelled')
            ->orderBy('delivery_date', 'asc')
            ->orderBy('delivery_time', 'asc')
            ->limit(8)
            ->get();

        // 5. Recent Payments Received (Latest 5)
        $recentPayments = Payment::with(['customer', 'invoice'])
            ->where('tenant_id', $tenant->id)
            ->orderBy('id', 'desc')
            ->limit(5)
            ->get();

        $data = [
            'revenue_this_month'          => $revenueThisMonth,
            'total_receivables'           => $totalReceivables,
            'total_invoices_count'        => $totalInvoicesCount,
            'paid_invoices_count'         => $paidInvoicesCount,
            'active_orders_count'         => $activeOrdersCount,
            'today_orders_count'          => $todayOrdersCount,
            'today_portions_count'        => $todayPortionsCount,
            'completed_orders_this_month' => $completedOrdersThisMonth,
            'low_stock_materials_count'   => $lowStockMaterialsCount,
            'pending_po_count'            => $pendingPoCount,
            'today_orders'                => $todayOrders,
            'priority_orders'             => $priorityOrders,
            'low_stock_items'             => $lowStockItems->take(6),
            'recent_payments'             => $recentPayments,
        ];

        return $this->successResponse($data, 'Metrik dashboard berhasil dimuat.');
    }
}
