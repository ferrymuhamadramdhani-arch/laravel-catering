<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterTenantRequest;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Services\TenantContext;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    /**
     * Register a new Tenant and its initial Owner account.
     */
    public function registerTenant(RegisterTenantRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $result = DB::transaction(function () use ($validated) {
            // 1. Create Tenant
            $tenant = Tenant::create([
                'name' => $validated['tenant_name'],
                'slug' => $validated['tenant_slug'],
                'phone' => $validated['phone'] ?? null,
                'email' => $validated['email'],
                'subscription_plan' => 'starter',
                'is_active' => true,
                'trial_ends_at' => now()->addDays(14),
            ]);

            // 2. Create Owner User
            $user = User::create([
                'name' => $validated['owner_name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'phone' => $validated['phone'] ?? null,
                'role' => 'owner',
                'current_tenant_id' => $tenant->id,
            ]);

            // 3. Link User to Tenant with Owner Role
            TenantUser::create([
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'role' => 'owner',
                'is_active' => true,
            ]);

            $token = $user->createToken('cateros_auth_token')->plainTextToken;

            return [
                'user' => $user,
                'tenant' => $tenant,
                'token' => $token,
            ];
        });

        return $this->successResponse(
            $result,
            'Tenant dan akun owner berhasil didaftarkan.',
            201
        );
    }

    /**
     * Authenticate a user and return access token.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Kredensial yang diberikan tidak cocok dengan catatan kami.'],
            ]);
        }

        // Determine active tenant
        $tenant = null;
        if (!empty($validated['tenant_slug'])) {
            $tenant = Tenant::where('slug', $validated['tenant_slug'])->where('is_active', true)->first();
            if (!$tenant || !$user->tenants()->where('tenants.id', $tenant->id)->exists()) {
                return $this->errorResponse('Anda tidak memiliki akses ke tenant catering ini.', 403);
            }
        } else {
            $tenant = $user->currentTenant ?: $user->tenants()->where('is_active', true)->first();
        }

        if ($tenant) {
            $user->update(['current_tenant_id' => $tenant->id]);
        }

        $token = $user->createToken('cateros_auth_token')->plainTextToken;

        return $this->successResponse([
            'user' => $user->load('currentTenant'),
            'tenant' => $tenant,
            'token' => $token,
        ], 'Login berhasil.');
    }

    /**
     * Get authenticated user profile and active tenant.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['currentTenant', 'tenants']);

        return $this->successResponse([
            'user' => $user,
            'current_tenant' => $user->currentTenant,
            'tenants' => $user->tenants,
        ], 'Data profil berhasil diambil.');
    }

    /**
     * Switch active tenant for the user.
     */
    public function switchTenant(Request $request): JsonResponse
    {
        $request->validate([
            'tenant_id' => ['required', 'exists:tenants,id'],
        ]);

        $user = $request->user();
        $targetTenant = $user->tenants()->where('tenants.id', $request->input('tenant_id'))->first();

        if (!$targetTenant) {
            return $this->errorResponse('Anda tidak terdaftar di tenant ini.', 403);
        }

        $user->update(['current_tenant_id' => $targetTenant->id]);

        return $this->successResponse([
            'user' => $user->fresh('currentTenant'),
            'current_tenant' => $targetTenant,
        ], 'Tenant aktif berhasil diubah.');
    }

    /**
     * Logout user and revoke tokens.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->successResponse(null, 'Logout berhasil.');
    }
}
