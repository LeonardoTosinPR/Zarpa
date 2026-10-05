<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupOrder extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'delivery_group_id',
        'order_id',
        'stop_sequence',
        'stop_type',
        'isolated_distance_km',
        'shared_distance_km',
        'allocated_cost',
        'merchant_discount',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected $casts = [
        'stop_sequence' => 'integer',
        'isolated_distance_km' => 'decimal:2',
        'shared_distance_km' => 'decimal:2',
        'allocated_cost' => 'decimal:2',
        'merchant_discount' => 'decimal:2',
    ];

    /**
     * Lote econômico ao qual esta parada pertence.
     */
    public function deliveryGroup(): BelongsTo
    {
        return $this->belongsTo(DeliveryGroup::class);
    }

    /**
     * Pedido associado a esta parada.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
