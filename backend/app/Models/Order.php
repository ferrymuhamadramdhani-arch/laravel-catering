<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'order_number',
        'event_name',
        'event_type',
        'delivery_date',
        'delivery_time',
        'delivery_area_id',
        'delivery_address',
        'recipient_name',
        'recipient_phone',
        'subtotal_amount',
        'delivery_fee',
        'discount_amount',
        'tax_amount',
        'total_amount',
        'total_hpp',
        'down_payment_amount',
        'payment_status',
        'status',
        'cancellation_reason',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'delivery_date'       => 'date:Y-m-d',
            'subtotal_amount'     => 'decimal:2',
            'delivery_fee'        => 'decimal:2',
            'discount_amount'     => 'decimal:2',
            'tax_amount'          => 'decimal:2',
            'total_amount'        => 'decimal:2',
            'total_hpp'           => 'decimal:2',
            'down_payment_amount' => 'decimal:2',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function deliveryArea(): BelongsTo
    {
        return $this->belongsTo(DeliveryArea::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class)->orderBy('created_at', 'desc');
    }
}
