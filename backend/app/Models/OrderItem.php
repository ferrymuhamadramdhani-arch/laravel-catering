<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'item_type',
        'menu_package_id',
        'menu_item_id',
        'item_name',
        'unit_price',
        'unit_hpp',
        'quantity',
        'subtotal_price',
        'subtotal_hpp',
        'portion_unit',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'unit_price'     => 'decimal:2',
            'unit_hpp'       => 'decimal:2',
            'quantity'       => 'integer',
            'subtotal_price' => 'decimal:2',
            'subtotal_hpp'   => 'decimal:2',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(MenuPackage::class, 'menu_package_id');
    }

    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class, 'menu_item_id');
    }
}
