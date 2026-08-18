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
