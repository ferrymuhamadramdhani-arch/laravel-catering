<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\RawMaterial;
use App\Models\Tenant;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    /**
     * Get business KPI overview and revenue trends.
     */
    public function getOverview(Tenant $tenant, ?string $startDate = null, ?string $endDate = null): array
    {
        $start = $startDate ? $startDate . ' 00:00:00' : now()->subDays(30)->startOfDay()->toDateTimeString();
        $end = $endDate ? $endDate . ' 23:59:59' : now()->endOfDay()->toDateTimeString();

        // 1. Orders within period
        $orders = Order::where('tenant_id', $tenant->id)
            ->where('created_at', '>=', $start)
            ->where('created_at', '<=', $end)
            ->where('status', '!=', 'cancelled')
            ->with(['items.menuItem.recipes', 'items.menuPackage.items.menuItem.recipes'])
            ->get();

        $totalOrders = $orders->count();
        $grossRevenue = (float) $orders->sum('total_amount');
        $averageOrderValue = $totalOrders > 0 ? $grossRevenue / $totalOrders : 0.0;

        // 2. Realized Paid Revenue from Payments
        $paidRevenue = (float) Payment::where('tenant_id', $tenant->id)
            ->where('created_at', '>=', $start)
            ->where('created_at', '<=', $end)
            ->whereIn('status', ['confirmed', 'success'])
            ->sum('amount');

        // 3. Calculate Total HPP / COGS from BOM
        $totalHpp = 0.0;
        foreach ($orders as $order) {
            foreach ($order->items as $item) {
                $qty = (float) $item->quantity;
                if ($item->menuItem) {
                    $itemHpp = (float) $item->menuItem->recipes->sum('subtotal_cost');
                    $totalHpp += $itemHpp * $qty;
                } elseif ($item->menuPackage) {
                    $pkgHpp = 0.0;
                    foreach ($item->menuPackage->items as $pkgItem) {
                        if ($pkgItem->menuItem) {
                            $pkgHpp += (float) $pkgItem->menuItem->recipes->sum('subtotal_cost') * (float) $pkgItem->quantity;
                        }
                    }
                    $totalHpp += $pkgHpp * $qty;
                }
            }
        }

        $grossProfit = $grossRevenue - $totalHpp;
        $grossMarginPercentage = $grossRevenue > 0 ? ($grossProfit / $grossRevenue) * 100 : 0.0;

        // 4. Daily Sales Trend Chart Data
        $dailyTrends = Order::where('tenant_id', $tenant->id)
            ->where('created_at', '>=', $start)
            ->where('created_at', '<=', $end)
            ->where('status', '!=', 'cancelled')
            ->selectRaw('DATE(created_at) as date, COUNT(id) as total_orders, SUM(total_amount) as total_revenue')
            ->groupBy('date')
            ->orderBy('date', 'asc')
            ->get()
            ->map(function ($row) {
                return [
                    'date' => $row->date,
                    'total_orders' => (int) $row->total_orders,
                    'total_revenue' => (float) $row->total_revenue,
                ];
            });

        return [
            'start_date' => $start,
            'end_date' => $end,
            'total_orders' => $totalOrders,
            'gross_revenue' => $grossRevenue,
            'paid_revenue' => $paidRevenue,
            'total_hpp' => $totalHpp,
            'gross_profit' => $grossProfit,
            'gross_margin_percentage' => round($grossMarginPercentage, 2),
            'average_order_value' => round($averageOrderValue, 2),
            'daily_trends' => $dailyTrends,
        ];
    }

    /**
     * Get menu performance ranking and profit margins.
     */
    public function getMenuAnalytics(Tenant $tenant, ?string $startDate = null, ?string $endDate = null): array
    {
        $start = $startDate ? $startDate . ' 00:00:00' : now()->subDays(30)->startOfDay()->toDateTimeString();
        $end = $endDate ? $endDate . ' 23:59:59' : now()->endOfDay()->toDateTimeString();

        // 1. Menu Items Sales
        $orderItems = OrderItem::whereHas('order', function ($q) use ($tenant, $start, $end) {
                $q->where('tenant_id', $tenant->id)
                  ->where('created_at', '>=', $start)
                  ->where('created_at', '<=', $end)
                  ->where('status', '!=', 'cancelled');
            })
            ->with(['menuItem.recipes', 'menuPackage'])
            ->get();

        $menuStats = [];

        foreach ($orderItems as $item) {
            $name = $item->item_name;
            $qty = (float) $item->quantity;
            $subtotal = (float) $item->subtotal_price;

            $costPerUnit = 0.0;
            if ($item->menuItem) {
                $costPerUnit = (float) $item->menuItem->recipes->sum('subtotal_cost');
            } elseif ($item->menuPackage) {
                $costPerUnit = (float) $item->menuPackage->estimated_hpp;
            }

            $totalCost = $costPerUnit * $qty;
            $profit = $subtotal - $totalCost;

            if (!isset($menuStats[$name])) {
                $menuStats[$name] = [
                    'name' => $name,
                    'type' => $item->menu_package_id ? 'Paket' : 'Menu Satuan',
                    'total_portions_sold' => 0,
                    'total_revenue' => 0.0,
                    'total_cost' => 0.0,
                    'total_profit' => 0.0,
                    'selling_price' => (float) $item->unit_price,
                    'unit_hpp' => $costPerUnit,
                ];
            }

            $menuStats[$name]['total_portions_sold'] += $qty;
            $menuStats[$name]['total_revenue'] += $subtotal;
            $menuStats[$name]['total_cost'] += $totalCost;
            $menuStats[$name]['total_profit'] += $profit;
        }

        // Calculate margin % and sort by revenue
        $menuList = array_values(array_map(function ($m) {
            $margin = $m['total_revenue'] > 0 ? ($m['total_profit'] / $m['total_revenue']) * 100 : 0.0;
            $m['margin_percentage'] = round($margin, 1);
            return $m;
        }, $menuStats));

        usort($menuList, fn($a, $b) => $b['total_revenue'] <=> $a['total_revenue']);

        return [
            'total_menus_analyzed' => count($menuList),
            'top_menus' => array_slice($menuList, 0, 10),
            'all_menus' => $menuList,
        ];
    }

    /**
     * Get customer retention metrics and top corporate clients.
     */
    public function getCustomerAnalytics(Tenant $tenant, ?string $startDate = null, ?string $endDate = null): array
    {
        $start = $startDate ? $startDate . ' 00:00:00' : now()->subDays(90)->startOfDay()->toDateTimeString();
        $end = $endDate ? $endDate . ' 23:59:59' : now()->endOfDay()->toDateTimeString();

        $totalCustomers = Customer::where('tenant_id', $tenant->id)->count();

        // Customer orders aggregation
        $customersWithOrders = Customer::where('tenant_id', $tenant->id)
            ->withCount(['orders' => function ($q) {
                $q->where('status', '!=', 'cancelled');
            }])
            ->withSum(['orders' => function ($q) {
                $q->where('status', '!=', 'cancelled');
            }], 'total_amount')
            ->get();

        $repeatCustomersCount = $customersWithOrders->filter(fn($c) => $c->orders_count > 1)->count();
        $singleOrderCustomersCount = $customersWithOrders->filter(fn($c) => $c->orders_count === 1)->count();
        $activeCustomersCount = $customersWithOrders->filter(fn($c) => $c->orders_count > 0)->count();

        $repeatRate = $activeCustomersCount > 0 ? ($repeatCustomersCount / $activeCustomersCount) * 100 : 0.0;

        // Top VIP Clients by Spend
        $topClients = $customersWithOrders
            ->sortByDesc('orders_sum_total_amount')
            ->take(10)
            ->values()
            ->map(function ($c) {
                return [
                    'id' => $c->id,
                    'name' => $c->name,
                    'phone' => $c->phone,
                    'email' => $c->email,
                    'company_name' => $c->company_name ?? 'Personal',
                    'total_orders' => (int) $c->orders_count,
                    'total_spend' => (float) ($c->orders_sum_total_amount ?? 0),
                    'average_spend_per_order' => $c->orders_count > 0 ? round((float) $c->orders_sum_total_amount / $c->orders_count, 2) : 0.0,
                ];
            });

        return [
            'total_customers' => $totalCustomers,
            'active_customers' => $activeCustomersCount,
            'repeat_customers' => $repeatCustomersCount,
            'single_order_customers' => $singleOrderCustomersCount,
            'repeat_order_rate_percentage' => round($repeatRate, 1),
            'top_vip_clients' => $topClients,
        ];
    }

    /**
     * Demand forecasting algorithm based on historical moving average and trend projection.
     */
    public function getDemandForecasting(Tenant $tenant, int $daysAhead = 14): array
    {
        // 1. Analyze historical order volume of past 30 days
        $pastDays = 30;
        $historyStart = now()->subDays($pastDays)->startOfDay();

        $pastOrders = Order::where('tenant_id', $tenant->id)
            ->where('delivery_date', '>=', $historyStart->toDateString())
            ->where('delivery_date', '<=', now()->toDateString())
            ->where('status', '!=', 'cancelled')
            ->with(['items.menuItem.recipes.rawMaterial'])
            ->get();

        $totalHistoricalPortions = 0;
        $materialUsageHistory = [];

        foreach ($pastOrders as $order) {
            foreach ($order->items as $item) {
                $qty = (float) $item->quantity;
                $totalHistoricalPortions += $qty;

                if ($item->menuItem) {
                    foreach ($item->menuItem->recipes as $recipe) {
                        $matId = $recipe->raw_material_id;
                        $matUsage = (float) $recipe->quantity * $qty;
                        $matName = $recipe->rawMaterial?->name ?? 'Bahan #' . $matId;
                        $unit = $recipe->rawMaterial?->unit ?? 'kg';
                        $price = (float) ($recipe->rawMaterial?->default_purchase_price ?? $recipe->cost_per_unit);

                        if (!isset($materialUsageHistory[$matId])) {
                            $materialUsageHistory[$matId] = [
                                'raw_material_id' => $matId,
                                'material_name' => $matName,
                                'unit' => $unit,
                                'unit_price' => $price,
                                'total_used' => 0.0,
                            ];
                        }
                        $materialUsageHistory[$matId]['total_used'] += $matUsage;
                    }
                }
            }
        }

        // Daily average portions
        $avgDailyPortions = $pastDays > 0 ? $totalHistoricalPortions / $pastDays : 0;
        // Growth factor multiplier (estimated 5% safety buffer for catering readiness)
        $forecastDailyPortions = ceil($avgDailyPortions * 1.05);

        // Projected daily demand timeline
        $timeline = [];
        for ($i = 1; $i <= $daysAhead; $i++) {
            $date = now()->addDays($i)->toDateString();
            $dayName = now()->addDays($i)->locale('id')->isoFormat('dddd');
            // Weekend multiplier (usually catering peaks on Friday, Saturday, Sunday)
            $isWeekend = in_array(now()->addDays($i)->dayOfWeek, [0, 5, 6]);
            $dayMultiplier = $isWeekend ? 1.35 : 0.9;
            $estimatedPortions = ceil($forecastDailyPortions * $dayMultiplier);

            $timeline[] = [
                'date' => $date,
                'day_name' => $dayName,
                'estimated_portions' => $estimatedPortions,
            ];
        }

        // Forecasted raw material requirements for the upcoming period
        $projectedMaterials = [];
        $totalForecastCost = 0.0;

        foreach ($materialUsageHistory as $mat) {
            $dailyAvgUsage = $pastDays > 0 ? $mat['total_used'] / $pastDays : 0;
            $projectedUsage = ceil($dailyAvgUsage * $daysAhead * 10) / 10; // 1 decimal place
            $estCost = $projectedUsage * $mat['unit_price'];
            $totalForecastCost += $estCost;

            $projectedMaterials[] = [
                'raw_material_id' => $mat['raw_material_id'],
                'material_name' => $mat['material_name'],
                'unit' => $mat['unit'],
                'daily_average_usage' => round($dailyAvgUsage, 2),
                'projected_total_quantity' => $projectedUsage,
                'unit_price' => $mat['unit_price'],
                'estimated_total_cost' => $estCost,
            ];
        }

        usort($projectedMaterials, fn($a, $b) => $b['estimated_total_cost'] <=> $a['estimated_total_cost']);

        return [
            'forecast_period_days' => $daysAhead,
            'historical_avg_daily_portions' => round($avgDailyPortions, 1),
            'forecast_daily_portions_baseline' => $forecastDailyPortions,
            'total_estimated_procurement_cost' => $totalForecastCost,
            'daily_timeline' => $timeline,
            'forecasted_materials' => $projectedMaterials,
        ];
    }

    /**
     * Detailed Income Statement / Profit & Loss (P&L) Report.
     */
    public function getFinancialReport(Tenant $tenant, ?string $startDate = null, ?string $endDate = null): array
    {
        $start = $startDate ? $startDate . ' 00:00:00' : now()->startOfMonth()->toDateTimeString();
        $end = $endDate ? $endDate . ' 23:59:59' : now()->endOfMonth()->toDateTimeString();

        $overview = $this->getOverview($tenant, $startDate, $endDate);

        // Breakdown HPP by Raw Material Categories
        $materials = RawMaterial::where('tenant_id', $tenant->id)->get()->keyBy('id');

        $orders = Order::where('tenant_id', $tenant->id)
            ->where('created_at', '>=', $start)
            ->where('created_at', '<=', $end)
            ->where('status', '!=', 'cancelled')
            ->with(['items.menuItem.recipes'])
            ->get();

        $categoryCosts = [];

        foreach ($orders as $order) {
            foreach ($order->items as $item) {
                if ($item->menuItem) {
                    foreach ($item->menuItem->recipes as $recipe) {
                        $mat = $materials->get($recipe->raw_material_id);
                        $cat = $mat?->category ?? 'Lain-lain';
                        $cost = (float) $recipe->subtotal_cost * (float) $item->quantity;

                        if (!isset($categoryCosts[$cat])) {
                            $categoryCosts[$cat] = 0.0;
                        }
                        $categoryCosts[$cat] += $cost;
                    }
                }
            }
        }

        $hppBreakdown = [];
        foreach ($categoryCosts as $cat => $cost) {
            $hppBreakdown[] = [
                'category' => $cat,
                'total_cost' => $cost,
                'percentage' => $overview['total_hpp'] > 0 ? round(($cost / $overview['total_hpp']) * 100, 1) : 0,
            ];
        }

        return [
            'tenant_name' => $tenant->name,
            'start_date' => $start,
            'end_date' => $end,
            'revenue' => [
                'gross_sales' => $overview['gross_revenue'],
                'realized_cash_in' => $overview['paid_revenue'],
                'accounts_receivable' => $overview['gross_revenue'] - $overview['paid_revenue'],
            ],
            'cost_of_goods_sold' => [
                'total_cogs' => $overview['total_hpp'],
                'breakdown_by_category' => $hppBreakdown,
            ],
            'profitability' => [
                'gross_profit' => $overview['gross_profit'],
                'gross_margin_percentage' => $overview['gross_margin_percentage'],
                'net_operating_income' => $overview['gross_profit'], // Net profit before tax/depreciation
            ],
        ];
    }

    /**
     * Generate CSV export string for financial P&L.
     */
    public function generateFinancialCsv(Tenant $tenant, ?string $startDate = null, ?string $endDate = null): string
    {
        $report = $this->getFinancialReport($tenant, $startDate, $endDate);

        $output = fopen('php://temp', 'r+');

        fputcsv($output, ['LAPORAN LABA RUGI & FINANSIAL CATERING']);
        fputcsv($output, ['Bisnis / Tenant', $tenant->name]);
        fputcsv($output, ['Periode', "{$report['start_date']} s/d {$report['end_date']}"]);
        fputcsv($output, []);

        fputcsv($output, ['KOMPONEN KEUANGAN', 'NILAI (IDR)']);
        fputcsv($output, ['Total Pendapatan Kotor (Gross Sales)', number_format($report['revenue']['gross_sales'], 0, ',', '.')]);
        fputcsv($output, ['Total Kas Diterima (Realized Inflow)', number_format($report['revenue']['realized_cash_in'], 0, ',', '.')]);
        fputcsv($output, ['Sisa Piutang Usaha (AR)', number_format($report['revenue']['accounts_receivable'], 0, ',', '.')]);
        fputcsv($output, []);

        fputcsv($output, ['HARGA POKOK PENJUALAN (HPP / COGS)', 'NILAI (IDR)', 'PERSENTASE']);
        foreach ($report['cost_of_goods_sold']['breakdown_by_category'] as $cogs) {
            fputcsv($output, [
                'Biaya Bahan: ' . $cogs['category'],
                number_format($cogs['total_cost'], 0, ',', '.'),
                $cogs['percentage'] . '%',
            ]);
        }
        fputcsv($output, ['TOTAL BIAYA HPP BAHAN BAKU', number_format($report['cost_of_goods_sold']['total_cogs'], 0, ',', '.'), '100%']);
        fputcsv($output, []);

        fputcsv($output, ['LABA KOTOR (GROSS PROFIT)', number_format($report['profitability']['gross_profit'], 0, ',', '.')]);
        fputcsv($output, ['GROSS PROFIT MARGIN (%)', $report['profitability']['gross_margin_percentage'] . '%']);
        fputcsv($output, ['LABA BERSIH OPERASIONAL', number_format($report['profitability']['net_operating_income'], 0, ',', '.')]);

        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        return $csvContent;
    }
}
