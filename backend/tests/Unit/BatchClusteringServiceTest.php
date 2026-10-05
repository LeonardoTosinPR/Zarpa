<?php

use App\Models\Client;
use App\Models\Order;
use App\Models\User;
use App\Services\BatchClusteringService;
use App\Services\FreightCalculatorService;
use App\Services\OsrmRoutingService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->routingService = app(OsrmRoutingService::class);
    $this->freightCalculator = app(FreightCalculatorService::class);
    $this->clusteringService = app(BatchClusteringService::class);

    // Cria lojista base
    $user = User::create([
        'name' => 'Lojista Teste',
        'email' => 'lojista.batch.unit@zarpa.com.br',
        'password' => bcrypt('password123'),
        'role' => 'client',
        'phone' => '(42) 99999-1111',
    ]);
    $this->client = Client::create([
        'user_id' => $user->id,
        'business_name' => 'Lojista Teste Guarapuava',
        'cnpj_cpf' => '12.345.678/0001-90',
        'default_address' => 'Centro, Guarapuava - PR',
        'default_lat' => -25.3940,
        'default_lng' => -51.4630,
    ]);
});

test('sequenceStopsWithPrecedence guarantees that every pickup precedes its delivery', function () {
    // Cria 3 pedidos econômicos fictícios com coordenadas reais
    $orders = collect();
    for ($i = 1; $i <= 3; $i++) {
        $orders->push(Order::create([
            'client_id' => $this->client->id,
            'package_description' => "Pacote #{$i}",
            'package_weight_kg' => 2.0,
            'package_volume_m3' => 0.01,
            'shipping_type' => 'economic',
            'status' => 'pending',
            'is_anchor' => ($i === 1),
            'individual_freight_price' => 15.00,
            'distance_km' => 4.0,
            'estimated_duration_minutes' => 10,
            'origin_address' => "Origem #{$i}",
            'dest_address' => "Destino #{$i}",
            'origin_lat' => -25.3900 + ($i * 0.005),
            'origin_lng' => -51.4600 + ($i * 0.005),
            'dest_lat' => -25.3600 + ($i * 0.005),
            'dest_lng' => -51.4700 + ($i * 0.005),
        ]));
    }

    $stops = $this->clusteringService->sequenceStopsWithPrecedence($orders);

    // Total de paradas deve ser exatamente 2 x número de pedidos
    expect($stops)->toHaveCount(6);

    // Para cada pedido, a coleta DEVE vir antes da entrega
    foreach ($orders as $order) {
        $pickupIndex = -1;
        $deliveryIndex = -1;

        foreach ($stops as $idx => $stop) {
            if ($stop['order']->id === $order->id) {
                if ($stop['type'] === 'pickup') {
                    $pickupIndex = $idx;
                } elseif ($stop['type'] === 'delivery') {
                    $deliveryIndex = $idx;
                }
            }
        }

        expect($pickupIndex)->toBeGreaterThanOrEqual(0)
            ->and($deliveryIndex)->toBeGreaterThanOrEqual(0)
            ->and($pickupIndex)->toBeLessThan($deliveryIndex, "Coleta do pedido #{$order->id} deve anteceder sua entrega.");
    }
});

test('processBatch respects max weight capacity per group', function () {
    // Cria pedidos com peso elevado (ex: 3 pedidos de 12kg cada, limite é 20kg)
    for ($i = 1; $i <= 3; $i++) {
        Order::create([
            'client_id' => $this->client->id,
            'package_description' => "Carga Pesada #{$i}",
            'package_weight_kg' => 12.0, // Acumulado de 2 pedidos = 24kg > 20kg
            'package_volume_m3' => 0.05,
            'shipping_type' => 'economic',
            'status' => 'pending',
            'is_anchor' => false,
            'individual_freight_price' => 25.00,
            'distance_km' => 5.0,
            'estimated_duration_minutes' => 12,
            'origin_address' => 'Centro',
            'dest_address' => 'Bonsucesso',
            'origin_lat' => -25.3900,
            'origin_lng' => -51.4600,
            'dest_lat' => -25.3600,
            'dest_lng' => -51.4700,
        ]);
    }

    $result = $this->clusteringService->processBatch(null, 10.0, false);

    expect($result['success'])->toBeTrue()
        ->and($result['orders_processed'])->toBe(3);

    // Como cada pedido tem 12kg e o limite é 20kg, não cabem 2 no mesmo lote
    // Devem ser formados 3 lotes separados!
    expect($result['groups_created'])->toBe(3);
});

test('haversineDistance calculates realistic geographic distances in Guarapuava', function () {
    // Distância aproximada entre Centro e UTFPR Guarapuava (aprox. 4.2 km em linha reta)
    $centroLat = -25.3942;
    $centroLng = -51.4635;
    $utfprLat = -25.3582;
    $utfprLng = -51.4682;

    $dist = $this->clusteringService->haversineDistance($centroLat, $centroLng, $utfprLat, $utfprLng);

    expect($dist)->toBeGreaterThan(3.5)
        ->and($dist)->toBeLessThan(5.0);
});
