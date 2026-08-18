<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MenuItem extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'menu_category_id',
        'name',
        'slug',
        'code',
        'image_url',
        'description',
        'selling_price',
        'calculated_hpp',
        'margin_percentage',
        'portion_unit',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'selling_price' => 'decimal:2',
            'calculated_hpp' => 'decimal:2',
            'margin_percentage' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(MenuCategory::class, 'menu_category_id');
    }

    public function recipes(): HasMany
    {
        return $this->hasMany(MenuRecipeBom::class);
    }

    public function packageItems(): HasMany
    {
        return $this->hasMany(MenuPackageItem::class);
    }
}
