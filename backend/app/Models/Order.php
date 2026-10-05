<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class Order extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'client_id',
        'courier_id',
        'package_description',
        'package_weight_kg',
        'package_volume_m3',
        'shipping_type',
        'status',
        'is_anchor',
        'individual_freight_price',
        'final_freight_price',
        'distance_km',
        'estimated_duration_minutes',
        'route_geometry',
        'proof_photo_url',
        'delivered_at',
        'origin_address',
        'dest_address',
        'origin_lat',
        'origin_lng',
        'dest_lat',
        'dest_lng',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'package_weight_kg' => 'decimal:2',
            'package_volume_m3' => 'decimal:4',
            'individual_freight_price' => 'decimal:2',
            'final_freight_price' => 'decimal:2',
            'distance_km' => 'decimal:2',
            'estimated_duration_minutes' => 'integer',
            'origin_lat' => 'decimal:8',
            'origin_lng' => 'decimal:8',
            'dest_lat' => 'decimal:8',
            'dest_lng' => 'decimal:8',
            'is_anchor' => 'boolean',
            'delivered_at' => 'datetime',
        ];
    }

    /**
     * Bootstrap the model and its events.
     */
    protected static function booted(): void
    {
        static::saved(function (Order $order) {
            // Sincroniza colunas espaciais PostGIS origin_location e dest_location
            if ($order->origin_lat && $order->origin_lng && $order->dest_lat && $order->dest_lng) {
                DB::statement("
                    UPDATE orders 
                    SET 
                        origin_location = ST_SetSRID(ST_MakePoint(origin_lng, origin_lat), 4326),
                        dest_location = ST_SetSRID(ST_MakePoint(dest_lng, dest_lat), 4326)
                    WHERE id = ?
                ", [$order->id]);
            }
        });
    }

    /**
     * Relationship with Client.
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Relationship with Courier.
     */
    public function courier(): BelongsTo
    {
        return $this->belongsTo(Courier::class);
    }

    /**
     * Scope for pending orders.
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope for client's orders.
     */
    public function scopeForClient(Builder $query, int $clientId): Builder
    {
        return $query->where('client_id', $clientId);
    }

    /**
     * Scope for economic orders.
     */
    public function scopeEconomic(Builder $query): Builder
    {
        return $query->where('shipping_type', 'economic');
    }

    /**
     * Scope for express orders.
     */
    public function scopeExpress(Builder $query): Builder
    {
        return $query->where('shipping_type', 'express');
    }

    /**
     * Paradas associadas a este pedido em lotes de entrega.
     */
    public function groupOrders(): HasMany
    {
        return $this->hasMany(GroupOrder::class);
    }

    /**
     * Lotes de entrega aos quais este pedido pertence.
     */
    public function deliveryGroups(): BelongsToMany
    {
        return $this->belongsToMany(DeliveryGroup::class, 'group_orders')
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

    /**
     * Lote de entrega mais recente ou ativo deste pedido.
     */
    public function currentDeliveryGroup(): ?DeliveryGroup
    {
        return $this->deliveryGroups()->latest('delivery_groups.created_at')->first();
    }
}
