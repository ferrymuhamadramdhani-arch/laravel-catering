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
        'payment_gateway_provider',
        'payment_gateway_ref',
        'snap_token',
        'customer_ip',
        'tracking_code',
        'status',
        'cancellation_reason',
        'notes',
        'created_by',
    ];

    protected $appends = [
        'kitchen_status',
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

    public function getKitchenStatusAttribute(): array
    {
        $tasks = $this->relationLoaded('productionTasks') ? $this->productionTasks : $this->productionTasks()->get();
        $total = $tasks->count();
        if ($total === 0) {
            return [
                'has_tasks' => false,
                'is_completed' => true,
                'total_tasks' => 0,
                'completed_tasks' => 0,
                'pending_tasks' => 0,
            ];
        }

        $completed = $tasks->where('stage', 'completed')->count();
        $pending = $total - $completed;

        return [
            'has_tasks' => true,
            'is_completed' => $pending === 0,
            'total_tasks' => $total,
            'completed_tasks' => $completed,
            'pending_tasks' => $pending,
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

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class)->orderBy('created_at', 'desc');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->orderBy('payment_date', 'desc');
    }

    public function productionTasks(): HasMany
    {
        return $this->hasMany(ProductionTask::class);
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class)->orderBy('id', 'desc');
    }

    public function delivery(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Delivery::class)->latestOfMany();
    }

    public function deliveryProof(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(DeliveryProof::class);
    }
}
