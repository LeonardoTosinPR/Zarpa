<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class Courier extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'cnh',
        'vehicle_type',
        'vehicle_plate',
        'current_lat',
        'current_lng',
        'cluster_radius_km',
        'is_online',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'current_lat' => 'decimal:8',
            'current_lng' => 'decimal:8',
            'cluster_radius_km' => 'decimal:2',
            'is_online' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Bootstrap the model and its events.
     */
    protected static function booted(): void
    {
        static::saved(function (Courier $courier) {
            if ($courier->current_lat && $courier->current_lng) {
                DB::statement("
                    UPDATE couriers 
                    SET current_location = ST_SetSRID(ST_MakePoint(current_lng, current_lat), 4326)
                    WHERE id = ?
                ", [$courier->id]);
            }
        });
    }

    /**
     * Scope for couriers ready to receive radar notifications.
     */
    public function scopeAvailableForRadar(Builder $query): Builder
    {
        return $query->where('is_online', true)
                     ->where('is_active', true)
                     ->whereNotNull('current_lat')
                     ->whereNotNull('current_lng');
    }

    /**
     * Atualiza as coordenadas do entregador e reflete imediatamente no PostGIS.
     */
    public function updateLocation(float $lat, float $lng): bool
    {
        $this->current_lat = $lat;
        $this->current_lng = $lng;
        return $this->save();
    }

    /**
     * Relationship with User.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relationship with Orders.
     */
    public function orders(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Order::class);
    }
}
