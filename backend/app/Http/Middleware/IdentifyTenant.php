<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Services\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IdentifyTenant
{
    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = null;

        // 1. Check from Header X-Tenant-ID
        if ($tenantId = $request->header('X-Tenant-ID')) {
            $tenant = Tenant::query()->where('id', $tenantId)->where('is_active', true)->first();
        }

        // 2. Check from Header X-Tenant-Slug
        if (!$tenant && ($tenantSlug = $request->header('X-Tenant-Slug'))) {
            $tenant = Tenant::query()->where('slug', $tenantSlug)->where('is_active', true)->first();
        }

        // 3. Check from Subdomain (e.g. {slug}.domain.com)
        if (!$tenant) {
            $host = $request->getHost();
            $parts = explode('.', $host);
            if (count($parts) >= 2 && $parts[0] !== 'www' && $parts[0] !== 'api' && $parts[0] !== 'localhost') {
                $subdomain = $parts[0];
                $tenant = Tenant::query()->where('slug', $subdomain)->where('is_active', true)->first();
            }
        }

        // 4. Check from Authenticated User's current_tenant_id
        if (!$tenant && $request->user()) {
            $user = $request->user();
            if ($user->current_tenant_id) {
                $tenant = Tenant::query()->where('id', $user->current_tenant_id)->where('is_active', true)->first();
            } elseif ($user->tenants()->exists()) {
                $tenant = $user->tenants()->where('is_active', true)->first();
            }
        }

        if ($tenant) {
            $this->tenantContext->setTenant($tenant);
        }

        return $next($request);
    }
}
