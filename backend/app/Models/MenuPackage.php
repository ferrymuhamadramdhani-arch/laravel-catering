<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MenuPackage extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'slug',
        'code',
        'package_type',
        'image_url',
        'description',
        'selling_price',
        'calculated_hpp',
        'margin_percentage',
        'min_order_quantity',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'selling_price' => 'decimal:2',
            'calculated_hpp' => 'decimal:2',
            'margin_percentage' => 'decimal:2',
            'min_order_quantity' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function packageItems(): HasMany
    {
        return $this->hasMany(MenuPackageItem::class);
    }
}
