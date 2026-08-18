<?php

namespace App\Services;

use App\Models\Tenant;

class TenantContext
{
    protected ?Tenant $tenant = null;

    /**
     * Set the current active tenant for this request.
     */
    public function setTenant(?Tenant $tenant): void
    {
        $this->tenant = $tenant;
    }

    /**
     * Get the current active tenant.
     */
    public function getTenant(): ?Tenant
    {
        return $this->tenant;
    }

    /**
     * Get the current active tenant ID.
     */
    public function getTenantId(): ?int
    {
        return $this->tenant?->id;
    }

    /**
     * Check if a tenant is currently bound.
     */
    public function hasTenant(): boolean|bool
    {
        return $this->tenant !== null;
    }

    /**
     * Reset tenant context.
     */
    public function clear(): void
    {
        $this->tenant = null;
    }
}
