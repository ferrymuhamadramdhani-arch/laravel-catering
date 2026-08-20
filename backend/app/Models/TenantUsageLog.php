<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TenantUsageLog extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'tenant_usage_logs';

    protected $fillable = [
        'tenant_id',
        'metric',
        'value',
        'recorded_date',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
            'recorded_date' => 'date',
        ];
    }
}
