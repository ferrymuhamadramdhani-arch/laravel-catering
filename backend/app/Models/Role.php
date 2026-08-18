<?php

namespace App\Models;

use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'name',
        'slug',
        'description',
        'permissions',
        'is_system',
    ];

    protected function casts(): array
    {
        return [
            'permissions' => 'array',
            'is_system' => 'boolean',
        ];
    }

    /**
     * Scope to include system roles + current tenant roles.
     */
    public function scopeForCurrentTenant(Builder $query, ?int $tenantId = null): Builder
    {
        $activeTenantId = $tenantId ?: app(TenantContext::class)->getTenantId();

        return $query->where(function ($q) use ($activeTenantId) {
            $q->where('is_system', true)
              ->whereNull('tenant_id');

            if ($activeTenantId) {
                $q->orWhere('tenant_id', $activeTenantId);
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Check if role has a specific permission key.
     */
    public function hasPermission(string $permission): bool
    {
        $permissions = $this->permissions ?? [];
        return in_array('*', $permissions) || in_array($permission, $permissions);
    }
}
