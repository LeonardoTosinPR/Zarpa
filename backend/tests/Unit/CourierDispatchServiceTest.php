<?php

use App\Models\User;
use App\Models\Client;
use App\Models\Courier;
use App\Models\Order;
use App\Services\CourierDispatchService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('getAvailableExpressOrders returns empty collection when courier is offline', function () {
    $user = User::create([
        'name' => 'Courier Offline',
        'email' => 'offline@zarpa.com.br',
        'password' => bcrypt('password123'),
        'role' => 'courier',
        'phone' => '(42) 99999-1111',
    ]);

    $courier = Courier::create([
        'user_id' => $user->id,
        'cnh' => '12345678901',
        'vehicle_type' => 'motorcycle',
        'current_lat' => -25.3954,
        'current_lng' => -51.4641,
        'is_online' => false,
        'is_active' => true,
    ]);

    $service = new CourierDispatchService();
    $orders = $service->getAvailableExpressOrders($courier);

    expect($orders)->toBeEmpty();
});

test('acceptExpressOrder returns 404 when order does not exist', function () {
    $user = User::create([
        'name' => 'Courier Not Found',
        'email' => 'notfound@zarpa.com.br',
        'password' => bcrypt('password123'),
        'role' => 'courier',
        'phone' => '(42) 99999-2222',
    ]);

    $courier = Courier::create([
        'user_id' => $user->id,
        'cnh' => '12345678901',
        'vehicle_type' => 'motorcycle',
        'current_lat' => -25.3954,
        'current_lng' => -51.4641,
        'is_online' => true,
        'is_active' => true,
    ]);

    $service = new CourierDispatchService();
    $result = $service->acceptExpressOrder(99999, $courier);

    expect($result['success'])->toBeFalse();
    expect($result['status'])->toBe(404);
});

test('acceptExpressOrder returns 409 when order is economic instead of express', function () {
    $clientUser = User::create([
        'name' => 'Client Economic Test',
        'email' => 'client_eco@zarpa.com.br',
        'password' => bcrypt('password123'),
        'role' => 'client',
        'phone' => '(42) 99999-3333',
    ]);

    $client = Client::create([
        'user_id' => $clientUser->id,
        'business_name' => 'Loja Teste',
        'cnpj_cpf' => '00.000.000/0001-00',
    ]);

    $order = Order::create([
        'client_id' => $client->id,
        'package_description' => 'Pacote econômico',
        'package_weight_kg' => 1.0,
        'shipping_type' => 'economic',
        'status' => 'pending',
        'individual_freight_price' => 10.00,
        'distance_km' => 2.5,
        'estimated_duration_minutes' => 6,
        'origin_address' => 'Centro',
        'dest_address' => 'Batel',
        'origin_lat' => -25.3954,
        'origin_lng' => -51.4641,
        'dest_lat' => -25.3850,
        'dest_lng' => -51.4550,
    ]);

    $courierUser = User::create([
        'name' => 'Courier Eco Test',
        'email' => 'courier_eco@zarpa.com.br',
        'password' => bcrypt('password123'),
        'role' => 'courier',
        'phone' => '(42) 99999-4444',
    ]);

    $courier = Courier::create([
        'user_id' => $courierUser->id,
        'cnh' => '12345678901',
        'vehicle_type' => 'motorcycle',
        'current_lat' => -25.3954,
        'current_lng' => -51.4641,
        'is_online' => true,
        'is_active' => true,
    ]);

    $service = new CourierDispatchService();
    $result = $service->acceptExpressOrder($order->id, $courier);

    expect($result['success'])->toBeFalse();
    expect($result['status'])->toBe(409);
    expect($result['error_code'])->toBe('ORDER_ALREADY_CLAIMED');
});
