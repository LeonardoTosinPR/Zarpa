<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeliveryGroup extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'courier_id',
        'scheduled_date',
        'total_distance_km',
        'total_duration_minutes',
        'status',
        'total_combined_cost',
        'total_savings_generated',
        'courier_bonus',
        'route_geometry',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected $casts = [
        'scheduled_date' => 'date',
        'total_distance_km' => 'decimal:2',
        'total_duration_minutes' => 'integer',
        'total_combined_cost' => 'decimal:2',
        'total_savings_generated' => 'decimal:2',
        'courier_bonus' => 'decimal:2',
    ];

    /**
     * Entregador parceiro escalado para este lote.
     */
    public function courier(): BelongsTo
    {
        return $this->belongsTo(Courier::class);
    }

    /**
     * Paradas associadas a este lote (ordenadas por stop_sequence).
     */
    public function groupOrders(): HasMany
    {
        return $this->hasMany(GroupOrder::class)->orderBy('stop_sequence');
    }

    /**
     * Pedidos que compõem este lote (com dados do pivô).
     */
    public function orders(): BelongsToMany
    {
        return $this->belongsToMany(Order::class, 'group_orders')
            ->withPivot([
                'id',
                'stop_sequence',
                'stop_type',
                'isolated_distance_km',
                'shared_distance_km',
                'allocated_cost',
                'merchant_discount',
            ])
            ->withTimestamps();
    }
}
