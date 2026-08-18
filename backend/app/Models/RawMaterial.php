<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RawMaterial extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'code',
        'category',
        'unit',
        'default_purchase_price',
        'minimum_stock',
        'current_stock',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'default_purchase_price' => 'decimal:2',
            'minimum_stock' => 'decimal:2',
            'current_stock' => 'decimal:2',
        ];
    }

    public function recipes(): HasMany
    {
        return $this->hasMany(MenuRecipeBom::class);
    }
}
