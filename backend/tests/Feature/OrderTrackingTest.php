<?php

use App\Models\User;
use App\Models\Client;
use App\Models\Courier;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    // 1. Criar Lojista Dono
    $this->ownerClientUser = User::create([
        'name' => 'Lojista Dono',
        'email' => 'dono@zarpa.com.br',
        'password' => bcrypt('password123'),
        'role' => 'client',
        'phone' => '(42) 99111-0000',
    ]);

    $this->ownerClient = Client::create([
        'user_id' => $this->ownerClientUser->id,
        'business_name' => 'Pizzaria Centro Zarpa',
        'cnpj_cpf' => '11.222.333/0001-44',
        'default_address' => 'Rua Saldanha Marinho, 1200, Centro',
        'default_lat' => -25.3954,
        'default_lng' => -51.4641,
    ]);

    // 2. Criar Outro Lojista
    $this->otherClientUser = User::create([
        'name' => 'Outro Lojista',
        'email' => 'outro_lojista@zarpa.com.br',
        'password' => bcrypt('password123'),
        'role' => 'client',
        'phone' => '(42) 99222-0000',
    ]);

    $this->otherClient = Client::create([
        'user_id' => $this->otherClientUser->id,
        'business_name' => 'Hamburgueria Batel Zarpa',
        'cnpj_cpf' => '55.666.777/0001-88',
        'default_address' => 'Rua Capitão Rocha, 800, Batel',
        'default_lat' => -25.3990,
        'default_lng' => -51.4680,
    ]);

    // 3. Criar Entregador Atribuído
    $this->courierUser = User::create([
        'name' => 'Entregador Rastreamento',
        'email' => 'courier_tracking@zarpa.com.br',
        'password' => bcrypt('password123'),
        'role' => 'courier',
        'phone' => '(42) 99888-1111',
    ]);

    $this->courier = Courier::create([
        'user_id' => $this->courierUser->id,
        'cnh' => '12345678901',
        'vehicle_type' => 'motorcycle',
        'vehicle_plate' => 'ZRP-7777',
        'current_lat' => -25.3950,
        'current_lng' => -51.4640,
        'is_online' => true,
        'is_active' => true,
    ]);
});

test('merchant owner can track order and view rich event timeline with timestamps', function () {
    Sanctum::actingAs($this->ownerClientUser);

    $order = Order::create([
        'client_id' => $this->ownerClient->id,
        'courier_id' => $this->courier->id,
        'package_description' => 'Pizza Gigante e Refrigerante',
        'package_weight_kg' => 2.0,
        'shipping_type' => 'express',
        'status' => 'picked_up',
        'assigned_at' => now()->subMinutes(20),
        'picked_up_at' => now()->subMinutes(10),
        'individual_freight_price' => 18.00,
        'distance_km' => 4.0,
        'origin_address' => 'Rua Saldanha Marinho, 1200',
        'dest_address' => 'Rua Brigadeiro Rocha, 450',
        'origin_lat' => -25.3954,
        'origin_lng' => -51.4641,
        'dest_lat' => -25.4020,
        'dest_lng' => -51.4610,
    ]);

    $response = $this->getJson("/api/orders/{$order->id}/tracking");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'order_id',
            'status',
            'shipping_type',
            'package_description',
            'origin_address',
            'dest_address',
            'courier' => [
                'id',
                'name',
                'phone',
                'vehicle_type',
                'vehicle_plate',
            ],
            'timeline',
        ]);

    $timeline = $response->json('timeline');
    expect($timeline)->toHaveCount(4);
    expect($timeline[0]['step'])->toBe('created');
    expect($timeline[0]['completed'])->toBeTrue();
    expect($timeline[1]['step'])->toBe('assigned');
    expect($timeline[1]['completed'])->toBeTrue();
    expect($timeline[2]['step'])->toBe('picked_up');
    expect($timeline[2]['completed'])->toBeTrue();
    expect($timeline[3]['step'])->toBe('delivered');
    expect($timeline[3]['completed'])->toBeFalse();
});

test('unauthorized merchant receives 403 Forbidden when trying to track orders from other merchants', function () {
    Sanctum::actingAs($this->otherClientUser);

    $order = Order::create([
        'client_id' => $this->ownerClient->id,
        'package_description' => 'Pedido Privado',
        'package_weight_kg' => 1.0,
        'shipping_type' => 'economic',
        'status' => 'pending',
        'individual_freight_price' => 12.00,
        'distance_km' => 3.0,
        'origin_address' => 'Centro',
        'dest_address' => 'Batel',
        'origin_lat' => -25.3954,
        'origin_lng' => -51.4641,
        'dest_lat' => -25.3990,
        'dest_lng' => -51.4680,
    ]);

    $response = $this->getJson("/api/orders/{$order->id}/tracking");
    $response->assertStatus(403);
});

test('assigned courier can access order tracking', function () {
    Sanctum::actingAs($this->courierUser);

    $order = Order::create([
        'client_id' => $this->ownerClient->id,
        'courier_id' => $this->courier->id,
        'package_description' => 'Pedido em Rota',
        'package_weight_kg' => 1.2,
        'shipping_type' => 'express',
        'status' => 'assigned',
        'individual_freight_price' => 14.00,
        'distance_km' => 3.2,
        'origin_address' => 'Centro',
        'dest_address' => 'Santana',
        'origin_lat' => -25.3954,
        'origin_lng' => -51.4641,
        'dest_lat' => -25.4050,
        'dest_lng' => -51.4550,
    ]);

    $response = $this->getJson("/api/orders/{$order->id}/tracking");
    $response->assertStatus(200)
        ->assertJson([
            'order_id' => $order->id,
            'status' => 'assigned',
        ]);
});

