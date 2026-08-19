<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeliveryArea extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'city',
        'district',
        'postal_code',
        'delivery_fee',
        'min_order_amount',
        'estimated_delivery_minutes',
        'notes',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'delivery_fee'                 => 'decimal:2',
            'min_order_amount'             => 'decimal:2',
            'estimated_delivery_minutes'   => 'integer',
            'is_active'                    => 'boolean',
        ];
    }
}
