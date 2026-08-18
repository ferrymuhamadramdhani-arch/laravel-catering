<?php

use App\Http\Controllers\Api\V1\AuthController;
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

    // Protected Routes
    Route::middleware(['auth:sanctum', IdentifyTenant::class])->group(function () {
        Route::prefix('auth')->group(function () {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/switch-tenant', [AuthController::class, 'switchTenant']);
            Route::post('/logout', [AuthController::class, 'logout']);
        });

        // Health Check / Ping
        Route::get('/ping', function () {
            $tenant = app(\App\Services\TenantContext::class)->getTenant();
            return response()->json([
                'success' => true,
                'message' => 'CaterOS API is active',
                'active_tenant' => $tenant?->name,
                'timestamp' => now()->toISOString(),
            ]);
        });
    });
});
