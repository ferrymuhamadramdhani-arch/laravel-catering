<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsService;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AnalyticsController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext,
        protected AnalyticsService $analyticsService
    ) {}

    /**
     * Get business KPI overview and daily trends.
     */
    public function overview(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $data = $this->analyticsService->getOverview($tenant, $startDate, $endDate);

        return $this->successResponse($data, 'Data ringkasan analitik bisnis berhasil diambil.');
    }

    /**
     * Get menu performance & profit margin analytics.
     */
    public function menus(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $data = $this->analyticsService->getMenuAnalytics($tenant, $startDate, $endDate);

        return $this->successResponse($data, 'Data performa dan margin menu berhasil diambil.');
    }

    /**
     * Get customer retention & VIP client analytics.
     */
    public function customers(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $data = $this->analyticsService->getCustomerAnalytics($tenant, $startDate, $endDate);

        return $this->successResponse($data, 'Data retensi pelanggan dan klien VIP berhasil diambil.');
    }

    /**
     * Get demand forecasting for upcoming days.
     */
    public function forecasting(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $days = (int) $request->input('days', 14);
        $data = $this->analyticsService->getDemandForecasting($tenant, $days);

        return $this->successResponse($data, 'Data prediksi permintaan bahan baku berhasil dihitung.');
    }

    /**
     * Get Income Statement / P&L Financial Report.
     */
    public function financialReport(Request $request): JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $data = $this->analyticsService->getFinancialReport($tenant, $startDate, $endDate);

        return $this->successResponse($data, 'Laporan Laba Rugi finansial berhasil diambil.');
    }

    /**
     * Export Financial Report as CSV file download.
     */
    public function exportCsv(Request $request): StreamedResponse|JsonResponse
    {
        $tenant = $this->tenantContext->getTenant();
        if (!$tenant) {
            return $this->errorResponse('Tenant tidak aktif atau tidak ditemukan.', 404);
        }

        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $csv = $this->analyticsService->generateFinancialCsv($tenant, $startDate, $endDate);
        $filename = 'Laporan_Finansial_' . ($tenant->slug ?? 'catering') . '_' . date('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($csv) {
            echo $csv;
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
