<?php

use App\Models\Client;
use App\Models\Courier;
use App\Models\DeliveryGroup;
use App\Models\GroupOrder;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('client can fetch financial statement with rateio savings', function () {
    // 1. Cria usuário e lojista
    $user = User::create([
        'name' => 'Lojista Teste',
        'email' => 'lojista.fin@zarpa.com.br',
        'password' => bcrypt('password123'),
        'role' => 'client',
        'phone' => '(42) 99888-1111',
    ]);

    $client = Client::create([
        'user_id' => $user->id,
        'business_name' => 'Lojista Teste Guarapuava',
        'cnpj_cpf' => '12.345.678/0001-90',
        'default_address' => 'Rua Saldanha Marinho, 1000 - Centro',
        'default_lat' => -25.39000000,
        'default_lng' => -51.46000000,
    ]);

    // 2. Cria pedidos para o lojista: 1 expresso e 2 econômicos (com rateio aplicado)
    $orderExpress = Order::create([
        'client_id' => $client->id,
        'package_description' => 'Documentos Urgentes',
        'package_weight_kg' => 0.50,
        'shipping_type' => 'express',
        'status' => 'delivered',
        'individual_freight_price' => 15.00,
        'final_freight_price' => 15.00,
        'distance_km' => 3.60,
        'origin_address' => 'Origem 1',
        'dest_address' => 'Destino 1',
        'origin_lat' => -25.3900,
        'origin_lng' => -51.4600,
        'dest_lat' => -25.3950,
        'dest_lng' => -51.4650,
    ]);

    $orderEconomic1 = Order::create([
        'client_id' => $client->id,
        'package_description' => 'Caixa de Calçados',
        'package_weight_kg' => 2.00,
        'shipping_type' => 'economic',
        'status' => 'assigned',
        'individual_freight_price' => 18.50,
        'final_freight_price' => 16.55, // R$ 1,95 de desconto de rateio
        'distance_km' => 5.00,
        'origin_address' => 'Origem 2',
        'dest_address' => 'Destino 2',
        'origin_lat' => -25.3900,
        'origin_lng' => -51.4600,
        'dest_lat' => -25.4000,
        'dest_lng' => -51.4700,
    ]);

    $orderEconomic2 = Order::create([
        'client_id' => $client->id,
        'package_description' => 'Acessórios Eletrônicos',
        'package_weight_kg' => 1.50,
        'shipping_type' => 'economic',
        'status' => 'assigned',
        'individual_freight_price' => 21.00,
        'final_freight_price' => 18.65, // R$ 2,35 de desconto de rateio
        'distance_km' => 6.00,
        'origin_address' => 'Origem 3',
        'dest_address' => 'Destino 3',
        'origin_lat' => -25.3900,
        'origin_lng' => -51.4600,
        'dest_lat' => -25.4100,
        'dest_lng' => -51.4800,
    ]);

    // Cria o grupo de entrega associado aos pedidos econômicos
    $deliveryGroup = DeliveryGroup::create([
        'scheduled_date' => now()->toDateString(),
        'total_distance_km' => 11.00,
        'total_duration_minutes' => 35,
        'status' => 'assigned',
        'total_combined_cost' => 51.75,
        'total_savings_generated' => 12.50,
        'courier_bonus' => 6.25,
    ]);

    GroupOrder::create([
        'delivery_group_id' => $deliveryGroup->id,
        'order_id' => $orderEconomic1->id,
        'stop_sequence' => 1,
        'stop_type' => 'pickup',
        'isolated_distance_km' => 5.00,
        'shared_distance_km' => 3.44,
        'allocated_cost' => 16.55,
        'merchant_discount' => 1.95,
    ]);

    GroupOrder::create([
        'delivery_group_id' => $deliveryGroup->id,
        'order_id' => $orderEconomic2->id,
        'stop_sequence' => 2,
        'stop_type' => 'pickup',
        'isolated_distance_km' => 6.00,
        'shared_distance_km' => 4.12,
        'allocated_cost' => 18.65,
        'merchant_discount' => 2.35,
    ]);

    // Autentica como lojista
    Sanctum::actingAs($user);

    $response = $this->getJson('/api/client/financial-statement');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'success',
            'client' => ['id', 'business_name'],
            'summary' => [
                'total_orders_count',
                'economic_orders_count',
                'express_orders_count',
                'total_original_freight',
                'total_final_freight',
                'total_savings',
                'average_savings_percent',
            ],
            'orders' => [
                '*' => [
                    'id',
                    'package_description',
                    'shipping_type',
                    'status',
                    'individual_freight_price',
                    'final_freight_price',
                    'discount_amount',
                    'discount_percent',
                    'has_batch_discount',
                    'distance_km',
                    'created_at',
                ],
            ],
        ]);

    $data = $response->json();
    expect($data['summary']['total_orders_count'])->toBe(3);
    expect($data['summary']['economic_orders_count'])->toBe(2);
    expect($data['summary']['express_orders_count'])->toBe(1);

    // Valores:
    // Total Original = 15.00 + 18.50 + 21.00 = 54.50
    // Total Final = 15.00 + 16.55 + 18.65 = 50.20
    // Total Economia = 54.50 - 50.20 = 4.30 (1.95 + 2.35)
    expect($data['summary']['total_original_freight'])->toEqual(54.50);
    expect($data['summary']['total_final_freight'])->toEqual(50.20);
    expect($data['summary']['total_savings'])->toEqual(4.30);
    expect($data['summary']['average_savings_percent'])->toBeGreaterThan(7.0);
});

test('courier can fetch financial statement with batch bonus and rpm', function () {
    // 1. Cria usuário entregador
    $user = User::create([
        'name' => 'Entregador Teste',
        'email' => 'entregador.fin@zarpa.com.br',
        'password' => bcrypt('password123'),
        'role' => 'courier',
        'phone' => '(42) 99888-2222',
    ]);

    $courier = Courier::create([
        'user_id' => $user->id,
        'cnh' => '12345678900',
        'vehicle_type' => 'motorcycle',
        'vehicle_plate' => 'BRA2E19',
        'current_lat' => -25.39000000,
        'current_lng' => -51.46000000,
        'cluster_radius_km' => 7.00,
        'is_online' => true,
        'is_active' => true,
    ]);

    // 2. Cria 1 lote econômico com bônus atribuído ao condutor
    $deliveryGroup = DeliveryGroup::create([
        'courier_id' => $courier->id,
        'scheduled_date' => now()->toDateString(),
        'total_distance_km' => 11.00,
        'total_duration_minutes' => 40,
        'status' => 'completed',
        'total_combined_cost' => 51.75,
        'total_savings_generated' => 12.50,
        'courier_bonus' => 6.25, // Bônus 50%
    ]);

    // 3. Cria 1 entrega expressa concluída pelo condutor
    $clientUser = User::create([
        'name' => 'Restaurante Teste',
        'email' => 'rest.fin@zarpa.com.br',
        'password' => bcrypt('password123'),
        'role' => 'client',
        'phone' => '(42) 99888-3333',
    ]);
    $client = Client::create([
        'user_id' => $clientUser->id,
        'business_name' => 'Restaurante Sabor',
        'cnpj_cpf' => '99.888.777/0001-11',
        'default_address' => 'Centro',
        'default_lat' => -25.39,
        'default_lng' => -51.46,
    ]);

    Order::create([
        'client_id' => $client->id,
        'courier_id' => $courier->id,
        'package_description' => 'Marmita Térmica',
        'package_weight_kg' => 1.00,
        'shipping_type' => 'express',
        'status' => 'delivered',
        'individual_freight_price' => 16.00,
        'final_freight_price' => 16.00,
        'distance_km' => 4.00,
        'origin_address' => 'Origem',
        'dest_address' => 'Destino',
        'origin_lat' => -25.39,
        'origin_lng' => -51.46,
        'dest_lat' => -25.40,
        'dest_lng' => -51.47,
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/courier/financial-statement');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'success',
            'courier' => ['id', 'cnh', 'vehicle_type'],
            'summary' => [
                'total_deliveries_count',
                'economic_batches_count',
                'express_deliveries_count',
                'total_distance_km',
                'total_base_earnings',
                'total_batch_bonus',
                'total_earnings',
                'earnings_per_km',
            ],
            'batches',
            'express_orders',
        ]);

    $data = $response->json();
    expect($data['summary']['economic_batches_count'])->toBe(1);
    expect($data['summary']['express_deliveries_count'])->toBe(1);
    expect($data['summary']['total_batch_bonus'])->toEqual(6.25);

    // Distância: 11.00 + 4.00 = 15.00 km
    expect($data['summary']['total_distance_km'])->toEqual(15.00);

    // Ganhos Base:
    // Lote Base = 11.00 * 2.50 = 27.50
    // Expresso Base = 16.00
    // Total Base = 27.50 + 16.00 = 43.50
    // Total Ganhos = 43.50 + 6.25 = 49.75
    expect($data['summary']['total_base_earnings'])->toEqual(43.50);
    expect($data['summary']['total_earnings'])->toEqual(49.75);

    // Rendimento por km = 49.75 / 15.00 = 3.32 R$/km
    expect($data['summary']['earnings_per_km'])->toBeGreaterThan(3.0);
});

test('role restrictions prevent cross statement access', function () {
    $clientUser = User::create([
        'name' => 'Cliente Cross',
        'email' => 'client.cross@zarpa.com.br',
        'password' => bcrypt('password123'),
        'role' => 'client',
        'phone' => '(42) 99888-4444',
    ]);
    Client::create([
        'user_id' => $clientUser->id,
        'business_name' => 'Cliente Estabelecimento',
        'cnpj_cpf' => '00.111.222/0001-33',
        'default_address' => 'Centro',
        'default_lat' => -25.39,
        'default_lng' => -51.46,
    ]);

    $courierUser = User::create([
        'name' => 'Courier Cross',
        'email' => 'courier.cross@zarpa.com.br',
        'password' => bcrypt('password123'),
        'role' => 'courier',
        'phone' => '(42) 99888-5555',
    ]);
    Courier::create([
        'user_id' => $courierUser->id,
        'cnh' => '98765432100',
        'vehicle_type' => 'motorcycle',
        'vehicle_plate' => 'ABC1D23',
        'current_lat' => -25.39,
        'current_lng' => -51.46,
        'cluster_radius_km' => 5.0,
        'is_online' => true,
        'is_active' => true,
    ]);

    // Cliente tentando acessar extrato do condutor -> 403 Forbidden
    Sanctum::actingAs($clientUser);
    $this->getJson('/api/courier/financial-statement')
        ->assertStatus(403);

    // Condutor tentando acessar extrato do lojista -> 403 Forbidden
    Sanctum::actingAs($courierUser);
    $this->getJson('/api/client/financial-statement')
        ->assertStatus(403);
});
