<?php

use App\Models\User;
use App\Models\Client;
use App\Models\Courier;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    // 1. Criar Lojista com sede no Centro de Guarapuava
    $this->clientUser = User::create([
        'name' => 'Lojista Teste Guarapuava',
        'email' => 'lojista_express@zarpa.com.br',
        'password' => bcrypt('password123'),
        'role' => 'client',
        'phone' => '(42) 99111-2222',
    ]);

    $this->client = Client::create([
        'user_id' => $this->clientUser->id,
        'business_name' => 'Supermercado Central Zarpa',
        'cnpj_cpf' => '12.345.678/0001-90',
        'default_address' => 'Rua XV de Novembro, Centro, Guarapuava - PR',
        'default_lat' => -25.3954,
        'default_lng' => -51.4641,
    ]);

    // 2. Criar Entregador 1 posicionado no Centro (próximo)
    $this->courierUser1 = User::create([
        'name' => 'Motoboy Carlos Zarpa',
        'email' => 'carlos_express@zarpa.com.br',
        'password' => bcrypt('password123'),
        'role' => 'courier',
        'phone' => '(42) 99333-4444',
    ]);

    $this->courier1 = Courier::create([
        'user_id' => $this->courierUser1->id,
        'cnh' => '11111111111',
        'vehicle_type' => 'motorcycle',
        'vehicle_plate' => 'ABC-1234',
        'current_lat' => -25.3950,
        'current_lng' => -51.4640,
        'cluster_radius_km' => 5.0,
        'is_online' => true,
        'is_active' => true,
    ]);

    // 3. Criar Entregador 2 posicionado no Centro para testes de concorrência
    $this->courierUser2 = User::create([
        'name' => 'Motoboy Bruno Zarpa',
        'email' => 'bruno_express@zarpa.com.br',
        'password' => bcrypt('password123'),
        'role' => 'courier',
        'phone' => '(42) 99555-6666',
    ]);

    $this->courier2 = Courier::create([
        'user_id' => $this->courierUser2->id,
        'cnh' => '22222222222',
        'vehicle_type' => 'motorcycle',
        'vehicle_plate' => 'XYZ-9876',
        'current_lat' => -25.3952,
        'current_lng' => -51.4642,
        'cluster_radius_km' => 5.0,
        'is_online' => true,
        'is_active' => true,
    ]);
});

test('courier can update online status toggle via PATCH /api/courier/status', function () {
    $token = $this->courierUser1->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->patchJson('/api/courier/status', [
            'is_online' => false,
        ]);

    $response->assertStatus(200)
        ->assertJson([
            'is_online' => false,
        ]);

    $this->assertDatabaseHas('couriers', [
        'id' => $this->courier1->id,
        'is_online' => false,
    ]);
});

test('courier can update GPS coordinates and sync PostGIS current_location', function () {
    $token = $this->courierUser1->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/courier/location', [
            'lat' => -25.3850,
            'lng' => -51.4550,
        ]);

    $response->assertStatus(200)
        ->assertJson([
            'location' => [
                'current_lat' => -25.385,
                'current_lng' => -51.455,
            ],
        ]);

    $this->assertDatabaseHas('couriers', [
        'id' => $this->courier1->id,
        'current_lat' => -25.3850,
        'current_lng' => -51.4550,
    ]);

    // Verifica se a geometria PostGIS foi sincronizada
    $location = DB::selectOne("
        SELECT ST_AsText(current_location) as geom 
        FROM couriers 
        WHERE id = ?
    ", [$this->courier1->id]);

    expect($location->geom)->toContain('POINT(-51.455 -25.385)');
});

test('courier can view express orders within radar radius via GET /api/courier/radar', function () {
    // 1. Cria pedido expresso dentro do raio (Centro de Guarapuava, ~200m)
    $orderNearby = Order::create([
        'client_id' => $this->client->id,
        'package_description' => 'Medicamento urgente',
        'package_weight_kg' => 0.5,
        'shipping_type' => 'express',
        'status' => 'pending',
        'individual_freight_price' => 12.50,
        'distance_km' => 3.2,
        'estimated_duration_minutes' => 8,
        'origin_address' => 'Rua Saldanha Marinho, Centro, Guarapuava - PR',
        'dest_address' => 'Batel, Guarapuava - PR',
        'origin_lat' => -25.3955,
        'origin_lng' => -51.4645,
        'dest_lat' => -25.3800,
        'dest_lng' => -51.4500,
    ]);

    // 2. Cria pedido expresso muito distante (> 25km, ex: distrito rural ou outra cidade)
    $orderFar = Order::create([
        'client_id' => $this->client->id,
        'package_description' => 'Entrega distante no interior',
        'package_weight_kg' => 2.0,
        'shipping_type' => 'express',
        'status' => 'pending',
        'individual_freight_price' => 45.00,
        'distance_km' => 28.0,
        'estimated_duration_minutes' => 45,
        'origin_address' => 'Distrito do Guairacá, PR',
        'dest_address' => 'Centro',
        'origin_lat' => -25.6000,
        'origin_lng' => -51.2000,
        'dest_lat' => -25.3954,
        'dest_lng' => -51.4641,
    ]);

    // 3. Cria pedido econômico próximo (não deve aparecer no radar expresso)
    $orderEconomic = Order::create([
        'client_id' => $this->client->id,
        'package_description' => 'Roupa encomenda econômica',
        'package_weight_kg' => 1.0,
        'shipping_type' => 'economic',
        'status' => 'pending',
        'individual_freight_price' => 8.00,
        'distance_km' => 2.5,
        'estimated_duration_minutes' => 7,
        'origin_address' => 'Centro',
        'dest_address' => 'Santa Cruz',
        'origin_lat' => -25.3954,
        'origin_lng' => -51.4641,
        'dest_lat' => -25.4000,
        'dest_lng' => -51.4700,
    ]);

    $token = $this->courierUser1->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/courier/radar');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'courier',
            'orders_count',
            'orders',
            'timestamp',
        ]);

    $data = $response->json();
    expect($data['orders_count'])->toBe(1);
    expect($data['orders'][0]['id'])->toBe($orderNearby->id);
    expect($data['orders'][0]['pickup_distance_km'])->toBeLessThan(1.0);
});

test('courier can successfully accept an express order changing status to assigned', function () {
    $order = Order::create([
        'client_id' => $this->client->id,
        'package_description' => 'Documento urgente cartório',
        'package_weight_kg' => 0.2,
        'shipping_type' => 'express',
        'status' => 'pending',
        'individual_freight_price' => 10.00,
        'distance_km' => 2.0,
        'estimated_duration_minutes' => 5,
        'origin_address' => 'Centro',
        'dest_address' => 'Batel',
        'origin_lat' => -25.3954,
        'origin_lng' => -51.4641,
        'dest_lat' => -25.3850,
        'dest_lng' => -51.4550,
    ]);

    $token = $this->courierUser1->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/orders/{$order->id}/accept-express");

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'message' => 'Corrida expressa aceita com sucesso!',
            'order' => [
                'id' => $order->id,
                'status' => 'assigned',
                'courier_id' => $this->courier1->id,
            ],
        ]);

    $this->assertDatabaseHas('orders', [
        'id' => $order->id,
        'courier_id' => $this->courier1->id,
        'status' => 'assigned',
    ]);
});

test('pessimistic lock prevents race condition returning 409 Conflict to competing courier', function () {
    $order = Order::create([
        'client_id' => $this->client->id,
        'package_description' => 'Chaves esquecidas urgentes',
        'package_weight_kg' => 0.1,
        'shipping_type' => 'express',
        'status' => 'pending',
        'individual_freight_price' => 15.00,
        'distance_km' => 4.0,
        'estimated_duration_minutes' => 10,
        'origin_address' => 'Centro',
        'dest_address' => 'Bonsucesso',
        'origin_lat' => -25.3954,
        'origin_lng' => -51.4641,
        'dest_lat' => -25.3700,
        'dest_lng' => -51.4800,
    ]);

    $token1 = $this->courierUser1->createToken('token-1')->plainTextToken;
    $token2 = $this->courierUser2->createToken('token-2')->plainTextToken;

    // 1º Condutor aceita a corrida primeiro
    $response1 = $this->withHeader('Authorization', "Bearer {$token1}")
        ->postJson("/api/orders/{$order->id}/accept-express");

    $response1->assertStatus(200)
        ->assertJson([
            'success' => true,
            'order' => [
                'id' => $order->id,
                'courier_id' => $this->courier1->id,
            ],
        ]);

    // 2º Condutor tenta aceitar a mesma corrida simultaneamente
    $response2 = $this->withHeader('Authorization', "Bearer {$token2}")
        ->postJson("/api/orders/{$order->id}/accept-express");

    $response2->assertStatus(409)
        ->assertJson([
            'success' => false,
            'error_code' => 'ORDER_ALREADY_CLAIMED',
            'message' => 'Ops! Esta corrida já foi aceita por outro condutor parceiro.',
        ]);

    // Garante que o pedido permaneceu atribuído ao 1º entregador
    $this->assertDatabaseHas('orders', [
        'id' => $order->id,
        'courier_id' => $this->courier1->id,
        'status' => 'assigned',
    ]);
});

test('client is forbidden from accessing courier radar or accepting express orders', function () {
    $clientToken = $this->clientUser->createToken('client-token')->plainTextToken;

    $radarResponse = $this->withHeader('Authorization', "Bearer {$clientToken}")
        ->getJson('/api/courier/radar');

    $radarResponse->assertStatus(403);

    $acceptResponse = $this->withHeader('Authorization', "Bearer {$clientToken}")
        ->postJson('/api/orders/999/accept-express');

    $acceptResponse->assertStatus(403);
});

test('courier can reject an express order and it disappears from their radar while remaining for others', function () {
    $order = Order::create([
        'client_id' => $this->client->id,
        'package_description' => 'Pizza Delivery Expresso',
        'package_weight_kg' => 1.2,
        'shipping_type' => 'express',
        'status' => 'pending',
        'individual_freight_price' => 14.00,
        'distance_km' => 3.0,
        'estimated_duration_minutes' => 8,
        'origin_address' => 'Centro',
        'dest_address' => 'Batel',
        'origin_lat' => -25.3954,
        'origin_lng' => -51.4641,
        'dest_lat' => -25.3850,
        'dest_lng' => -51.4550,
    ]);

    $token1 = $this->courierUser1->createToken('token-1')->plainTextToken;
    $token2 = $this->courierUser2->createToken('token-2')->plainTextToken;

    // 1. Condutor 1 vê a oferta no radar
    $radar1 = $this->withHeader('Authorization', "Bearer {$token1}")
        ->getJson('/api/courier/radar');
    $radar1->assertStatus(200);
    expect($radar1->json('orders_count'))->toBe(1);

    // 2. Condutor 1 recusa o pedido
    $rejectResponse = $this->withHeader('Authorization', "Bearer {$token1}")
        ->postJson("/api/orders/{$order->id}/reject-express", [
            'reason' => 'Muito longe da rota atual',
        ]);
    $rejectResponse->assertStatus(200)
        ->assertJson([
            'success' => true,
        ]);

    $this->assertDatabaseHas('order_rejections', [
        'order_id' => $order->id,
        'courier_id' => $this->courier1->id,
    ]);

    // 3. Condutor 1 consulta o radar novamente: pedido NÃO aparece mais
    $radar1After = $this->withHeader('Authorization', "Bearer {$token1}")
        ->getJson('/api/courier/radar');
    expect($radar1After->json('orders_count'))->toBe(0);

    // 4. Condutor 2 consulta o radar: pedido AINDA aparece disponível para ele!
    $this->app['auth']->forgetGuards();
    $radar2 = $this->withHeader('Authorization', "Bearer {$token2}")
        ->getJson('/api/courier/radar');
    expect($radar2->json('orders_count'))->toBe(1);
    expect($radar2->json('orders.0.id'))->toBe($order->id);
});

test('courier can view and update profile including cluster_radius_km via GET and PATCH /api/courier/profile', function () {
    $token = $this->courierUser1->createToken('test')->plainTextToken;

    // 1. GET /api/courier/profile
    $getResponse = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/courier/profile');
    $getResponse->assertStatus(200)
        ->assertJsonStructure([
            'message',
            'courier' => ['id', 'cluster_radius_km', 'vehicle_type', 'vehicle_plate', 'cnh'],
            'user' => ['id', 'name', 'email'],
        ]);

    // 2. PATCH /api/courier/profile atualizando raio, veículo e telefone
    $patchResponse = $this->withHeader('Authorization', "Bearer {$token}")
        ->patchJson('/api/courier/profile', [
            'cluster_radius_km' => 8.5,
            'vehicle_type' => 'bicycle',
            'vehicle_plate' => 'CALOI-2026',
            'cnh' => '99887766554',
            'name' => 'Carlos Entregador Atualizado',
            'phone' => '42999998888',
        ]);

    $patchResponse->assertStatus(200)
        ->assertJson([
            'message' => 'Perfil do condutor atualizado com sucesso.',
            'courier' => [
                'cluster_radius_km' => '8.50',
                'vehicle_type' => 'bicycle',
                'vehicle_plate' => 'CALOI-2026',
                'cnh' => '99887766554',
            ],
            'user' => [
                'name' => 'Carlos Entregador Atualizado',
                'phone' => '42999998888',
            ],
        ]);

    // 3. Validação de limites do raio (rejeita raio absurdo como 0 ou 100)
    $invalidResponse = $this->withHeader('Authorization', "Bearer {$token}")
        ->patchJson('/api/courier/profile', [
            'cluster_radius_km' => 999,
        ]);
    $invalidResponse->assertStatus(422);
});
