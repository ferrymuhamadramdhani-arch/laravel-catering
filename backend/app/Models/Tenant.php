<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'domain',
        'phone',
        'email',
        'address',
        'logo_url',
        'subscription_plan',
        'business_type',
        'service_areas',
        'operating_hours',
        'bank_accounts',
        'is_active',
        'onboarding_completed',
        'trial_ends_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'onboarding_completed' => 'boolean',
            'business_type' => 'array',
            'service_areas' => 'array',
            'operating_hours' => 'array',
            'bank_accounts' => 'array',
            'trial_ends_at' => 'datetime',
        ];
    }

    /**
     * Users associated with this tenant.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'tenant_users')
            ->withPivot('role', 'is_active')
            ->withTimestamps();
    }

    /**
     * Pivot records for tenant users.
     */
    public function tenantUsers(): HasMany
    {
        return $this->hasMany(TenantUser::class);
    }

    /**
     * Active subscription of this tenant.
     */
    public function subscription()
    {
        return $this->hasOne(TenantSubscription::class)->latestOfMany();
    }

    /**
     * All subscriptions history.
     */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(TenantSubscription::class);
    }
}
