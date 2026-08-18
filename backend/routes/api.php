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
