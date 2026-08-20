<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\TenantProfileController;
use App\Http\Controllers\Api\V1\TenantUserController;
use App\Http\Middleware\IdentifyTenant;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - CaterOS
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    // Public Auth Routes
    Route::prefix('auth')->group(function () {
        Route::post('/register-tenant', [AuthController::class, 'registerTenant']);
        Route::post('/login', [AuthController::class, 'login']);
    });

    // Public Customer Portal Routes (Customer-facing Web)
    Route::prefix('public')->group(function () {
        Route::get('/tenant/{slug}/catalog', [\App\Http\Controllers\Api\V1\PublicCustomerPortalController::class, 'catalog']);
        Route::post('/tenant/{slug}/check-capacity', [\App\Http\Controllers\Api\V1\PublicCustomerPortalController::class, 'checkCapacity']);
        Route::post('/tenant/{slug}/checkout', [\App\Http\Controllers\Api\V1\PublicCustomerPortalController::class, 'checkout']);
        Route::get('/orders/track/{trackingNumber}', [\App\Http\Controllers\Api\V1\PublicCustomerPortalController::class, 'trackOrder']);

        // Payment Gateway & Webhooks (Midtrans / QRIS / VA)
        Route::post('/payment-gateway/create-token', [\App\Http\Controllers\Api\V1\PaymentGatewayController::class, 'createPaymentToken']);
        Route::post('/webhooks/payment-gateway', [\App\Http\Controllers\Api\V1\PaymentGatewayController::class, 'handleWebhook']);
        Route::post('/webhooks/whatsapp', [\App\Http\Controllers\Api\V1\WhatsAppController::class, 'handleWebhook']);
        Route::post('/payment-gateway/simulate-pay', [\App\Http\Controllers\Api\V1\PaymentGatewayController::class, 'simulatePayment']);
    });

    // Protected Tenant Routes
    Route::middleware(['auth:sanctum', IdentifyTenant::class])->group(function () {
        // Auth / Session
        Route::prefix('auth')->group(function () {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/switch-tenant', [AuthController::class, 'switchTenant']);
            Route::post('/logout', [AuthController::class, 'logout']);
        });

        // Tenant Profile & Setup Wizard
        Route::prefix('tenant')->group(function () {
            Route::get('/profile', [TenantProfileController::class, 'show']);
            Route::put('/profile', [TenantProfileController::class, 'update']);
            Route::post('/logo', [TenantProfileController::class, 'uploadLogo']);
            Route::post('/complete-onboarding', [TenantProfileController::class, 'completeOnboarding']);

            // Staff & User Management
            Route::get('/users', [TenantUserController::class, 'index']);
            Route::post('/users', [TenantUserController::class, 'store']);
            Route::put('/users/{id}', [TenantUserController::class, 'update']);
            Route::patch('/users/{id}/toggle-status', [TenantUserController::class, 'toggleStatus']);
            Route::delete('/users/{id}', [TenantUserController::class, 'destroy']);

            // Dynamic Roles & Permissions Matrix
            Route::get('/permissions', [\App\Http\Controllers\Api\V1\TenantRoleController::class, 'permissions']);
            Route::get('/roles', [\App\Http\Controllers\Api\V1\TenantRoleController::class, 'index']);
            Route::post('/roles', [\App\Http\Controllers\Api\V1\TenantRoleController::class, 'store']);
            Route::get('/roles/{id}', [\App\Http\Controllers\Api\V1\TenantRoleController::class, 'show']);
            Route::put('/roles/{id}', [\App\Http\Controllers\Api\V1\TenantRoleController::class, 'update']);
            Route::delete('/roles/{id}', [\App\Http\Controllers\Api\V1\TenantRoleController::class, 'destroy']);

            // Master Data - Raw Materials (Bahan Baku)
            Route::get('/raw-materials', [\App\Http\Controllers\Api\V1\RawMaterialController::class, 'index']);
            Route::post('/raw-materials', [\App\Http\Controllers\Api\V1\RawMaterialController::class, 'store']);
            Route::get('/raw-materials/{id}', [\App\Http\Controllers\Api\V1\RawMaterialController::class, 'show']);
            Route::put('/raw-materials/{id}', [\App\Http\Controllers\Api\V1\RawMaterialController::class, 'update']);
            Route::delete('/raw-materials/{id}', [\App\Http\Controllers\Api\V1\RawMaterialController::class, 'destroy']);

            // Master Data - Menu Categories
            Route::get('/menu-categories', [\App\Http\Controllers\Api\V1\MenuCategoryController::class, 'index']);
            Route::post('/menu-categories', [\App\Http\Controllers\Api\V1\MenuCategoryController::class, 'store']);
            Route::put('/menu-categories/{id}', [\App\Http\Controllers\Api\V1\MenuCategoryController::class, 'update']);
            Route::delete('/menu-categories/{id}', [\App\Http\Controllers\Api\V1\MenuCategoryController::class, 'destroy']);

            // Master Data - Menu Items & BOM Recipes
            Route::get('/menu-items', [\App\Http\Controllers\Api\V1\MenuItemController::class, 'index']);
            Route::post('/menu-items', [\App\Http\Controllers\Api\V1\MenuItemController::class, 'store']);
            Route::get('/menu-items/{id}', [\App\Http\Controllers\Api\V1\MenuItemController::class, 'show']);
            Route::put('/menu-items/{id}', [\App\Http\Controllers\Api\V1\MenuItemController::class, 'update']);
            Route::post('/menu-items/{id}/image', [\App\Http\Controllers\Api\V1\MenuItemController::class, 'uploadImage']);
            Route::delete('/menu-items/{id}', [\App\Http\Controllers\Api\V1\MenuItemController::class, 'destroy']);

            // Master Data - Menu Packages (Bundling)
            Route::get('/menu-packages', [\App\Http\Controllers\Api\V1\MenuPackageController::class, 'index']);
            Route::post('/menu-packages', [\App\Http\Controllers\Api\V1\MenuPackageController::class, 'store']);
            Route::get('/menu-packages/{id}', [\App\Http\Controllers\Api\V1\MenuPackageController::class, 'show']);
            Route::put('/menu-packages/{id}', [\App\Http\Controllers\Api\V1\MenuPackageController::class, 'update']);
            Route::post('/menu-packages/{id}/image', [\App\Http\Controllers\Api\V1\MenuPackageController::class, 'uploadImage']);
            Route::delete('/menu-packages/{id}', [\App\Http\Controllers\Api\V1\MenuPackageController::class, 'destroy']);

            // Master Data - Customers (Pelanggan)
            Route::get('/customers', [\App\Http\Controllers\Api\V1\CustomerController::class, 'index']);
            Route::post('/customers', [\App\Http\Controllers\Api\V1\CustomerController::class, 'store']);
            Route::get('/customers/{id}', [\App\Http\Controllers\Api\V1\CustomerController::class, 'show']);
            Route::put('/customers/{id}', [\App\Http\Controllers\Api\V1\CustomerController::class, 'update']);
            Route::delete('/customers/{id}', [\App\Http\Controllers\Api\V1\CustomerController::class, 'destroy']);

            // Master Data - Suppliers (Pemasok Bahan Baku)
            Route::get('/suppliers', [\App\Http\Controllers\Api\V1\SupplierController::class, 'index']);
            Route::post('/suppliers', [\App\Http\Controllers\Api\V1\SupplierController::class, 'store']);
            Route::get('/suppliers/{id}', [\App\Http\Controllers\Api\V1\SupplierController::class, 'show']);
            Route::put('/suppliers/{id}', [\App\Http\Controllers\Api\V1\SupplierController::class, 'update']);
            Route::delete('/suppliers/{id}', [\App\Http\Controllers\Api\V1\SupplierController::class, 'destroy']);

            // Master Data - Delivery Areas (Zona Pengiriman)
            Route::get('/delivery-areas', [\App\Http\Controllers\Api\V1\DeliveryAreaController::class, 'index']);
            Route::post('/delivery-areas', [\App\Http\Controllers\Api\V1\DeliveryAreaController::class, 'store']);
            Route::get('/delivery-areas/{id}', [\App\Http\Controllers\Api\V1\DeliveryAreaController::class, 'show']);
            Route::put('/delivery-areas/{id}', [\App\Http\Controllers\Api\V1\DeliveryAreaController::class, 'update']);
            Route::delete('/delivery-areas/{id}', [\App\Http\Controllers\Api\V1\DeliveryAreaController::class, 'destroy']);

            // Order Management (Modul Pemesanan & Alur Lifecycle)
            Route::get('/orders/calendar', [\App\Http\Controllers\Api\V1\OrderController::class, 'calendar']);
            Route::get('/orders', [\App\Http\Controllers\Api\V1\OrderController::class, 'index']);
            Route::post('/orders', [\App\Http\Controllers\Api\V1\OrderController::class, 'store']);
            Route::get('/orders/{id}', [\App\Http\Controllers\Api\V1\OrderController::class, 'show']);
            Route::put('/orders/{id}', [\App\Http\Controllers\Api\V1\OrderController::class, 'update']);
            Route::patch('/orders/{id}/status', [\App\Http\Controllers\Api\V1\OrderController::class, 'updateStatus']);
            Route::delete('/orders/{id}', [\App\Http\Controllers\Api\V1\OrderController::class, 'destroy']);

            // Inventory & Stock Management (Modul Inventaris Bahan Baku Dasar)
            Route::get('/inventory/summary', [\App\Http\Controllers\Api\V1\InventoryController::class, 'summary']);
            Route::get('/inventory/low-stock', [\App\Http\Controllers\Api\V1\InventoryController::class, 'lowStock']);
            Route::get('/inventory/ledgers', [\App\Http\Controllers\Api\V1\InventoryController::class, 'ledgers']);
            Route::post('/inventory/stock-in', [\App\Http\Controllers\Api\V1\InventoryController::class, 'stockIn']);
            Route::post('/inventory/stock-out', [\App\Http\Controllers\Api\V1\InventoryController::class, 'stockOut']);
            Route::post('/inventory/adjust', [\App\Http\Controllers\Api\V1\InventoryController::class, 'adjust']);

            // Goods Receipts (Penerimaan Barang PO)
            Route::get('/inventory/goods-receipts', [\App\Http\Controllers\Api\V1\GoodsReceiptController::class, 'index']);
            Route::get('/inventory/goods-receipts/{id}', [\App\Http\Controllers\Api\V1\GoodsReceiptController::class, 'show']);
            Route::post('/inventory/goods-receipts/{id}/receive', [\App\Http\Controllers\Api\V1\GoodsReceiptController::class, 'receive']);

            // Procurement (Purchase Orders)
            Route::get('/purchase-orders/suggestions', [\App\Http\Controllers\Api\V1\PurchaseOrderController::class, 'suggestions']);
            Route::post('/purchase-orders/from-suggestions', [\App\Http\Controllers\Api\V1\PurchaseOrderController::class, 'createFromSuggestions']);
            Route::get('/purchase-orders/price-history', [\App\Http\Controllers\Api\V1\PurchaseOrderController::class, 'priceHistory']);
            Route::get('/purchase-orders', [\App\Http\Controllers\Api\V1\PurchaseOrderController::class, 'index']);
            Route::post('/purchase-orders', [\App\Http\Controllers\Api\V1\PurchaseOrderController::class, 'store']);
            Route::get('/purchase-orders/{id}', [\App\Http\Controllers\Api\V1\PurchaseOrderController::class, 'show']);
            Route::patch('/purchase-orders/{id}/approve', [\App\Http\Controllers\Api\V1\PurchaseOrderController::class, 'approve']);
            Route::patch('/purchase-orders/{id}/cancel', [\App\Http\Controllers\Api\V1\PurchaseOrderController::class, 'cancel']);

            // Invoices & Finance (Keuangan & Invoicing)
            Route::get('/invoices', [\App\Http\Controllers\Api\V1\InvoiceController::class, 'index']);
            Route::post('/invoices', [\App\Http\Controllers\Api\V1\InvoiceController::class, 'store']);
            Route::get('/invoices/{id}', [\App\Http\Controllers\Api\V1\InvoiceController::class, 'show']);
            Route::delete('/invoices/{id}', [\App\Http\Controllers\Api\V1\InvoiceController::class, 'destroy']);
            Route::get('/finance/summary', [\App\Http\Controllers\Api\V1\InvoiceController::class, 'summary']);

            // Payments (Pencatatan Pembayaran)
            Route::get('/payments', [\App\Http\Controllers\Api\V1\PaymentController::class, 'index']);
            Route::post('/invoices/{invoiceId}/payments', [\App\Http\Controllers\Api\V1\PaymentController::class, 'store']);

            // Production & Kitchen System (Dapur & KDS)
            Route::get('/production/plans', [\App\Http\Controllers\Api\V1\ProductionController::class, 'index']);
            Route::post('/production/plans/generate', [\App\Http\Controllers\Api\V1\ProductionController::class, 'generate']);
            Route::get('/production/plans/{id}', [\App\Http\Controllers\Api\V1\ProductionController::class, 'show']);
            Route::patch('/production/tasks/{id}/stage', [\App\Http\Controllers\Api\V1\ProductionController::class, 'updateTaskStage']);
            Route::post('/production/plans/{id}/complete', [\App\Http\Controllers\Api\V1\ProductionController::class, 'completePlan']);
            Route::get('/production/orders/{orderId}/label', [\App\Http\Controllers\Api\V1\ProductionController::class, 'getOrderLabel']);

            // Deliveries & Courier System (Pengiriman & Kurir)
            Route::apiResource('couriers', \App\Http\Controllers\Api\V1\CourierController::class);
            Route::apiResource('vehicles', \App\Http\Controllers\Api\V1\VehicleController::class);
            Route::get('/deliveries/available-resources', [\App\Http\Controllers\Api\V1\DeliveryController::class, 'availableResources']);
            Route::get('/deliveries', [\App\Http\Controllers\Api\V1\DeliveryController::class, 'index']);
            Route::get('/deliveries/today', [\App\Http\Controllers\Api\V1\DeliveryController::class, 'today']);
            Route::get('/deliveries/routes/optimize', [\App\Http\Controllers\Api\V1\DeliveryRouteController::class, 'optimize']);
            Route::post('/deliveries/routes/batch-assign', [\App\Http\Controllers\Api\V1\DeliveryRouteController::class, 'batchAssign']);
            Route::get('/deliveries/routes/courier/{courierId}', [\App\Http\Controllers\Api\V1\DeliveryRouteController::class, 'courierSchedule']);
            Route::post('/deliveries/assign', [\App\Http\Controllers\Api\V1\DeliveryController::class, 'assign']);
            Route::get('/deliveries/{id}', [\App\Http\Controllers\Api\V1\DeliveryController::class, 'show']);
            Route::patch('/deliveries/{id}/status', [\App\Http\Controllers\Api\V1\DeliveryController::class, 'updateStatus']);
            Route::post('/deliveries/{id}/proof', [\App\Http\Controllers\Api\V1\DeliveryController::class, 'submitProof']);
            Route::post('/deliveries/sync-offline', [\App\Http\Controllers\Api\V1\DeliveryController::class, 'syncOffline']);

            // WhatsApp Official Notification Hub
            Route::get('/whatsapp/templates', [\App\Http\Controllers\Api\V1\WhatsAppController::class, 'templates']);
            Route::put('/whatsapp/templates/{id}', [\App\Http\Controllers\Api\V1\WhatsAppController::class, 'updateTemplate']);
            Route::get('/whatsapp/logs', [\App\Http\Controllers\Api\V1\WhatsAppController::class, 'logs']);
            Route::post('/whatsapp/send-manual', [\App\Http\Controllers\Api\V1\WhatsAppController::class, 'sendManual']);
            Route::post('/whatsapp/test', [\App\Http\Controllers\Api\V1\WhatsAppController::class, 'testSend']);

            // Advanced Analytics & Demand Forecasting (Fase 3.1)
            Route::get('/analytics/overview', [\App\Http\Controllers\Api\V1\AnalyticsController::class, 'overview']);
            Route::get('/analytics/menus', [\App\Http\Controllers\Api\V1\AnalyticsController::class, 'menus']);
            Route::get('/analytics/customers', [\App\Http\Controllers\Api\V1\AnalyticsController::class, 'customers']);
            Route::get('/analytics/forecasting', [\App\Http\Controllers\Api\V1\AnalyticsController::class, 'forecasting']);
            Route::get('/analytics/financial-report', [\App\Http\Controllers\Api\V1\AnalyticsController::class, 'financialReport']);
            Route::get('/analytics/export', [\App\Http\Controllers\Api\V1\AnalyticsController::class, 'exportCsv']);

            // Multi-Cabang (Multi-Location) & Stock Transfers (Fase 3.2)
            Route::get('/branches', [\App\Http\Controllers\Api\V1\BranchController::class, 'index']);
            Route::post('/branches', [\App\Http\Controllers\Api\V1\BranchController::class, 'store']);
            Route::get('/branches/{id}', [\App\Http\Controllers\Api\V1\BranchController::class, 'show']);
            Route::put('/branches/{id}', [\App\Http\Controllers\Api\V1\BranchController::class, 'update']);
            Route::delete('/branches/{id}', [\App\Http\Controllers\Api\V1\BranchController::class, 'destroy']);

            Route::get('/stock-transfers', [\App\Http\Controllers\Api\V1\StockTransferController::class, 'index']);
            Route::post('/stock-transfers', [\App\Http\Controllers\Api\V1\StockTransferController::class, 'store']);
            Route::post('/stock-transfers/{id}/ship', [\App\Http\Controllers\Api\V1\StockTransferController::class, 'ship']);
            Route::post('/stock-transfers/{id}/receive', [\App\Http\Controllers\Api\V1\StockTransferController::class, 'receive']);
            Route::post('/stock-transfers/{id}/cancel', [\App\Http\Controllers\Api\V1\StockTransferController::class, 'cancel']);

            // Dashboard Metrics
            Route::get('/dashboard/metrics', [\App\Http\Controllers\Api\V1\DashboardController::class, 'metrics']);
        });

        // Super Admin SaaS Management (Fase 3.4)
        Route::prefix('super-admin')->middleware(['auth:sanctum'])->group(function () {
            Route::get('/metrics', [\App\Http\Controllers\Api\V1\SuperAdminController::class, 'metrics']);
            Route::get('/tenants', [\App\Http\Controllers\Api\V1\SuperAdminController::class, 'tenants']);
            Route::patch('/tenants/{id}/status', [\App\Http\Controllers\Api\V1\SuperAdminController::class, 'updateTenantStatus']);
            Route::post('/tenants/{id}/plan', [\App\Http\Controllers\Api\V1\SuperAdminController::class, 'assignPlan']);
            Route::get('/plans', [\App\Http\Controllers\Api\V1\SuperAdminController::class, 'plans']);
            Route::put('/plans/{id}', [\App\Http\Controllers\Api\V1\SuperAdminController::class, 'updatePlan']);
        });

        // Health Check / Ping
        Route::get('/ping', function () {
            $tenant = app(\App\Services\TenantContext::class)->getTenant();
            return response()->json([
                'success' => true,
                'message' => 'CaterOS API is active',
                'active_tenant' => $tenant?->name,
                'onboarding_completed' => (bool) $tenant?->onboarding_completed,
                'timestamp' => now()->toISOString(),
            ]);
        });
    });
});
