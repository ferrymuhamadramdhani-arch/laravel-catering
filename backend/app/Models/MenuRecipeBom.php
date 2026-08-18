<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MenuRecipeBom extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'menu_recipes_bom';

    protected $fillable = [
        'tenant_id',
        'menu_item_id',
        'raw_material_id',
        'quantity',
        'unit',
        'cost_per_unit',
        'subtotal_cost',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:4',
            'cost_per_unit' => 'decimal:4',
            'subtotal_cost' => 'decimal:2',
        ];
    }

    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class);
    }

    public function rawMaterial(): BelongsTo
    {
        return $this->belongsTo(RawMaterial::class);
    }
}
