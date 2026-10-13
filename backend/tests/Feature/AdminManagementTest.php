<?php

use App\Models\Client;
use App\Models\Courier;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // 1. Cria Admin
    $this->adminUser = User::create([
        'name' => 'Admin Geral Zarpa',
        'email' => 'admin.test@zarpa.com.br',
        'password' => bcrypt('secret123'),
        'role' => 'admin',
        'phone' => '(42) 99999-1111',
    ]);

    // 2. Cria Lojista
    $this->merchantUser = User::create([
        'name' => 'Supermercado Dal Pozzo AdminTest',
        'email' => 'lojista.test@zarpa.com.br',
        'password' => bcrypt('secret123'),
        'role' => 'client',
        'phone' => '(42) 99888-2222',
    ]);
    $this->client = Client::create([
        'user_id' => $this->merchantUser->id,
        'business_name' => 'Supermercado Dal Pozzo',
        'cnpj_cpf' => '77.888.999/0001-00',
        'default_address' => 'Rua Saldanha Marinho, 1200 - Centro',
        'default_lat' => -25.3905,
        'default_lng' => -51.4628,
    ]);

    // 3. Cria Entregador
    $this->courierUser = User::create([
        'name' => 'Lucas Motoboy AdminTest',
        'email' => 'motoboy.test@zarpa.com.br',
        'password' => bcrypt('secret123'),
        'role' => 'courier',
        'phone' => '(42) 99777-3333',
    ]);
    $this->courier = Courier::create([
        'user_id' => $this->courierUser->id,
        'cnh' => '99887766554',
        'vehicle_type' => 'motorcycle',
        'vehicle_plate' => 'ZAR1234',
        'current_lat' => -25.3950,
        'current_lng' => -51.4600,
        'cluster_radius_km' => 10.0,
        'is_online' => true,
        'is_active' => true,
    ]);

    // 4. Cria Pedido Expresso
    $this->expressOrder = Order::create([
        'client_id' => $this->client->id,
        'courier_id' => $this->courier->id,
        'package_description' => 'Medicamento Urgente Farmacia',
        'package_weight_kg' => 0.5,
        'shipping_type' => 'express',
        'status' => 'assigned',
        'individual_freight_price' => 14.50,
        'distance_km' => 3.2,
        'estimated_duration_minutes' => 8,
        'origin_address' => 'Centro',
        'dest_address' => 'Bonsucesso',
        'origin_lat' => -25.3905,
        'origin_lng' => -51.4628,
        'dest_lat' => -25.3582,
        'dest_lng' => -51.4682,
    ]);

    // 5. Cria Pedido Econômico
    $this->economicOrder = Order::create([
        'client_id' => $this->client->id,
        'package_description' => 'Caixa de Doces Dal Pozzo',
        'package_weight_kg' => 2.0,
        'shipping_type' => 'economic',
        'status' => 'pending',
        'individual_freight_price' => 18.00,
        'distance_km' => 5.0,
        'estimated_duration_minutes' => 15,
        'origin_address' => 'Centro',
        'dest_address' => 'Santa Cruz',
        'origin_lat' => -25.3905,
        'origin_lng' => -51.4628,
        'dest_lat' => -25.3888,
        'dest_lng' => -51.4745,
    ]);
});

test('admin can view all system users and metrics via GET /api/admin/users', function () {
    $response = $this->actingAs($this->adminUser, 'sanctum')
        ->getJson('/api/admin/users');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'users' => [
                '*' => [
                    'id',
                    'name',
                    'email',
                    'role',
                    'phone',
                ],
            ],
            'metrics' => [
                'total',
                'clients',
                'couriers',
                'admins',
                'online_couriers',
            ],
        ]);

    $data = $response->json();
    expect($data['metrics']['total'])->toBeGreaterThanOrEqual(3)
        ->and($data['metrics']['clients'])->toBeGreaterThanOrEqual(1)
        ->and($data['metrics']['couriers'])->toBeGreaterThanOrEqual(1)
        ->and($data['metrics']['admins'])->toBeGreaterThanOrEqual(1);
});

test('admin can filter users by role and search string', function () {
    $response = $this->actingAs($this->adminUser, 'sanctum')
        ->getJson('/api/admin/users?role=courier&search=Lucas');

    $response->assertStatus(200);
    $users = $response->json('users');

    expect($users)->toHaveCount(1)
        ->and($users[0]['role'])->toBe('courier')
        ->and($users[0]['name'])->toContain('Lucas');
});

test('non-admin user receives 403 Forbidden on GET /api/admin/users', function () {
    $response = $this->actingAs($this->merchantUser, 'sanctum')
        ->getJson('/api/admin/users');

    $response->assertStatus(403);

    $courierResponse = $this->actingAs($this->courierUser, 'sanctum')
        ->getJson('/api/admin/users');

    $courierResponse->assertStatus(403);
});

test('admin can view all system orders and metrics via GET /api/admin/orders', function () {
    $response = $this->actingAs($this->adminUser, 'sanctum')
        ->getJson('/api/admin/orders');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'orders' => [
                '*' => [
                    'id',
                    'shipping_type',
                    'status',
                    'package_description',
                    'individual_freight_price',
                    'origin_address',
                    'dest_address',
                    'client',
                ],
            ],
            'metrics' => [
                'total',
                'express',
                'economic',
                'pending',
                'in_progress',
                'delivered',
                'canceled',
                'total_freight_value',
            ],
        ]);

    $data = $response->json();
    expect($data['metrics']['total'])->toBeGreaterThanOrEqual(2)
        ->and($data['metrics']['express'])->toBeGreaterThanOrEqual(1)
        ->and($data['metrics']['economic'])->toBeGreaterThanOrEqual(1);
});

test('admin can filter orders by status and shipping_type', function () {
    $response = $this->actingAs($this->adminUser, 'sanctum')
        ->getJson('/api/admin/orders?shipping_type=express&status=assigned');

    $response->assertStatus(200);
    $orders = $response->json('orders');

    expect($orders)->toHaveCount(1)
        ->and($orders[0]['shipping_type'])->toBe('express')
        ->and($orders[0]['status'])->toBe('assigned');
});

test('non-admin user receives 403 Forbidden on GET /api/admin/orders', function () {
    $response = $this->actingAs($this->merchantUser, 'sanctum')
        ->getJson('/api/admin/orders');

    $response->assertStatus(403);
});
