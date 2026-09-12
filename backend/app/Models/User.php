<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    /**
     * Relationship with Client profile (Lojista).
     */
    public function client(): HasOne
    {
        return $this->hasOne(Client::class);
    }

    /**
     * Relationship with Courier profile (Entregador).
     */
    public function courier(): HasOne
    {
        return $this->hasOne(Courier::class);
    }

    /**
     * Check if user is a client (merchant).
     */
    public function isClient(): bool
    {
        return $this->role === 'client';
    }

    /**
     * Check if user is a courier (driver).
     */
    public function isCourier(): bool
    {
        return $this->role === 'courier';
    }

    /**
     * Check if user is an admin.
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Check if user has full administrative privileges.
     */
    public function hasFullAccess(): bool
    {
        return $this->isAdmin();
    }
}
