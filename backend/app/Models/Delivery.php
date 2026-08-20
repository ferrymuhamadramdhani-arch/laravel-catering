<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Delivery extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'order_id',
        'delivery_number',
        'delivery_batch_code',
        'delivery_area_id',
        'courier_name',
        'courier_phone',
        'vehicle_type',
        'vehicle_plate_number',
        'destination_address',
        'recipient_name',
        'recipient_phone',
        'delivery_time_target',
        'status',
        'dispatched_at',
        'delivered_at',
        'assigned_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'dispatched_at' => 'datetime',
            'delivered_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function deliveryArea(): BelongsTo
    {
        return $this->belongsTo(DeliveryArea::class);
    }

    public function assignedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function proof(): HasOne
    {
        return $this->hasOne(DeliveryProof::class);
    }
}
