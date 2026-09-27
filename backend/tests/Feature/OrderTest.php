<?php

use App\Models\User;
use App\Models\Client;
use App\Models\Courier;
use App\Models\Order;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(UserSeeder::class);

    // Fake padrão do OSRM para garantir testes rápidos e determinísticos
    Http::fake([
        '*/route/v1/driving/*' => Http::response([
            'code' => 'Ok',
            'routes' => [
                [
                    'distance' => 6000.0, // 6.0 km
                    'duration' => 720.0,  // 12 min
                    'geometry' => '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
                    'legs' => [
                        [
                            'steps' => [],
                        ],
                    ],
                ],
            ],
        ], 200),
    ]);
});

test('authenticated user can query geocoding endpoint for address autocomplete', function () {
    $user = User::where('email', 'lojista@zarpa.com.br')->first();
    $token = $user->createToken('test')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/orders/geocode?q=Santa+Cruz');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'query',
            'results',
        ]);
});

test('user can estimate route and freight pricing without creating order', function () {
    $user = User::where('email', 'lojista@zarpa.com.br')->first();
    $token = $user->createToken('test')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/orders/estimate', [
            'origin_lat' => -25.3954,
            'origin_lng' => -51.4641,
            'dest_lat' => -25.3494,
            'dest_lng' => -51.4787,
            'package_weight_kg' => 2.5,
            'shipping_type' => 'economic',
        ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'route' => ['distance_km', 'duration_minutes', 'polyline_geometry'],
            'pricing' => ['individual_price', 'estimated_final_price', 'modalities'],
        ]);

    expect(Order::count())->toBe(0);
});

test('client can create an order successfully with PostGIS spatial persistence', function () {
    $user = User::where('email', 'lojista@zarpa.com.br')->first();
    $client = $user->client;
    $token = $user->createToken('test')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/orders', [
            'package_description' => 'Caixa de Livros Didáticos',
            'package_weight_kg' => 3.0,
            'shipping_type' => 'economic',
            'origin_address' => 'Rua Saldanha Marinho, 1200, Centro',
            'dest_address' => 'Av Laura Pacheco Bastos, 800, UTFPR',
            'origin_lat' => -25.3954,
            'origin_lng' => -51.4641,
            'dest_lat' => -25.3494,
            'dest_lng' => -51.4787,
        ]);

    $response->assertStatus(201)
        ->assertJsonStructure([
            'message',
            'order' => ['id', 'client_id', 'status', 'shipping_type', 'distance_km', 'individual_freight_price'],
            'pricing_details',
        ]);

    $order = Order::first();
    expect($order)->not->toBeNull()
        ->and($order->client_id)->toBe($client->id)
        ->and($order->status)->toBe('pending')
        ->and((float) $order->distance_km)->toBe(6.00)
        ->and((float) $order->individual_freight_price)->toBe(21.00); // 6.00 base + 6km * 2.50 = 21.00

    // Confere se os pontos espaciais PostGIS foram devidamente preenchidos
    $spatialCheck = DB::select("
        SELECT 
            ST_AsText(origin_location) as origin_wkt, 
            ST_AsText(dest_location) as dest_wkt 
        FROM orders 
        WHERE id = ?
    ", [$order->id]);

    expect($spatialCheck[0]->origin_wkt)->toContain('POINT(-51.4641 -25.3954)')
        ->and($spatialCheck[0]->dest_wkt)->toContain('POINT(-51.4787 -25.3494)');
});

test('courier is forbidden from creating client delivery orders', function () {
    $courierUser = User::where('email', 'entregador@zarpa.com.br')->first();
    $token = $courierUser->createToken('test')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/orders', [
            'package_description' => 'Tentativa de postagem inválida',
            'package_weight_kg' => 2.0,
            'shipping_type' => 'express',
            'origin_address' => 'Centro',
            'dest_address' => 'Batel',
            'origin_lat' => -25.3954,
            'origin_lng' => -51.4641,
            'dest_lat' => -25.3990,
            'dest_lng' => -51.4720,
        ]);

    $response->assertStatus(403);
    expect(Order::count())->toBe(0);
});

test('client can list their own orders with status filtering', function () {
    $user = User::where('email', 'lojista@zarpa.com.br')->first();
    $client = $user->client;

    Order::create([
        'client_id' => $client->id,
        'package_description' => 'Medicamentos',
        'package_weight_kg' => 0.5,
        'shipping_type' => 'express',
        'status' => 'pending',
        'individual_freight_price' => 15.00,
        'distance_km' => 3.6,
        'origin_address' => 'Centro',
        'dest_address' => 'Bonsucesso',
        'origin_lat' => -25.3954,
        'origin_lng' => -51.4641,
        'dest_lat' => -25.4120,
        'dest_lng' => -51.4580,
    ]);

    $token = $user->createToken('test')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/orders/my-orders');

    $response->assertStatus(200);
    $data = $response->json();
    expect($data['data'])->toHaveCount(1)
        ->and($data['data'][0]['package_description'])->toBe('Medicamentos');
});
