<?php

use App\Models\User;
use App\Models\Client;
use App\Models\Courier;
use App\Models\Order;
use App\Models\DeliveryGroup;
use App\Models\GroupOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    // 1. Criar Lojista
    $this->clientUser = User::create([
        'name' => 'Lojista Guarapuava',
        'email' => 'lojista_route@zarpa.com.br',
        'password' => bcrypt('password123'),
        'role' => 'client',
        'phone' => '(42) 99111-2222',
    ]);

    $this->client = Client::create([
        'user_id' => $this->clientUser->id,
        'business_name' => 'Comércio Rota Zarpa',
        'cnpj_cpf' => '12.345.678/0001-90',
        'default_address' => 'Rua XV de Novembro, 1000, Centro',
        'default_lat' => -25.3954,
        'default_lng' => -51.4641,
    ]);

    // 2. Criar Entregador Autorizado
    $this->courierUser = User::create([
        'name' => 'Entregador Autorizado',
        'email' => 'courier_route@zarpa.com.br',
        'password' => bcrypt('password123'),
        'role' => 'courier',
        'phone' => '(42) 99888-7777',
    ]);

    $this->courier = Courier::create([
        'user_id' => $this->courierUser->id,
        'cnh' => '12345678901',
        'vehicle_type' => 'motorcycle',
        'vehicle_plate' => 'ZRP-6600',
        'current_lat' => -25.3950,
        'current_lng' => -51.4640,
        'cluster_radius_km' => 10.0,
        'is_online' => true,
        'is_active' => true,
    ]);

    // 3. Criar Outro Entregador Não Autorizado
    $this->otherCourierUser = User::create([
        'name' => 'Outro Entregador',
        'email' => 'other_courier@zarpa.com.br',
        'password' => bcrypt('password123'),
        'role' => 'courier',
        'phone' => '(42) 99777-6666',
    ]);

    $this->otherCourier = Courier::create([
        'user_id' => $this->otherCourierUser->id,
        'cnh' => '98765432100',
        'vehicle_type' => 'motorcycle',
        'vehicle_plate' => 'OUT-9999',
        'current_lat' => -25.3910,
        'current_lng' => -51.4620,
        'is_online' => true,
        'is_active' => true,
    ]);
});

test('courier can confirm pickup transitioning order from assigned to picked_up with timestamp', function () {
    Sanctum::actingAs($this->courierUser);

    $order = Order::create([
        'client_id' => $this->client->id,
        'courier_id' => $this->courier->id,
        'package_description' => 'Pacote Eletrônico',
        'package_weight_kg' => 2.5,
        'shipping_type' => 'express',
        'status' => 'assigned',
        'assigned_at' => now()->subMinutes(10),
        'individual_freight_price' => 15.00,
        'distance_km' => 4.5,
        'origin_address' => 'Centro',
        'dest_address' => 'Batel',
        'origin_lat' => -25.3954,
        'origin_lng' => -51.4641,
        'dest_lat' => -25.3990,
        'dest_lng' => -51.4680,
    ]);

    $response = $this->postJson("/api/orders/{$order->id}/pickup");

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'message' => 'Coleta confirmada com sucesso! Mercadoria em mãos.',
            'order' => [
                'id' => $order->id,
                'status' => 'picked_up',
            ],
        ]);

    $order->refresh();
    expect($order->status)->toBe('picked_up');
    expect($order->picked_up_at)->not->toBeNull();
});

test('courier cannot confirm pickup if order is not assigned to them', function () {
    Sanctum::actingAs($this->otherCourierUser);

    $order = Order::create([
        'client_id' => $this->client->id,
        'courier_id' => $this->courier->id, // Pertence ao courier 1
        'package_description' => 'Marmita',
        'package_weight_kg' => 1.0,
        'shipping_type' => 'express',
        'status' => 'assigned',
        'individual_freight_price' => 12.00,
        'distance_km' => 3.0,
        'origin_address' => 'Centro',
        'dest_address' => 'Batel',
        'origin_lat' => -25.3954,
        'origin_lng' => -51.4641,
        'dest_lat' => -25.3990,
        'dest_lng' => -51.4680,
    ]);

    $response = $this->postJson("/api/orders/{$order->id}/pickup");
    $response->assertStatus(403);
});

test('state machine rejects deliver transition if order was not picked up first', function () {
    Sanctum::actingAs($this->courierUser);

    $order = Order::create([
        'client_id' => $this->client->id,
        'courier_id' => $this->courier->id,
        'package_description' => 'Documentos Urgentes',
        'package_weight_kg' => 0.5,
        'shipping_type' => 'express',
        'status' => 'assigned', // Ainda não coletado
        'individual_freight_price' => 10.00,
        'distance_km' => 2.0,
        'origin_address' => 'Centro',
        'dest_address' => 'Bonsucesso',
        'origin_lat' => -25.3954,
        'origin_lng' => -51.4641,
        'dest_lat' => -25.4050,
        'dest_lng' => -51.4700,
    ]);

    // Tentativa direta de finalizar entrega sem prévia coleta
    $response = $this->postJson("/api/orders/{$order->id}/deliver");

    $response->assertStatus(422)
        ->assertJson([
            'success' => false,
            'message' => "Transição inválida: o pedido deve ser marcado como 'picked_up' antes de ser finalizado. Status atual: assigned.",
        ]);
});

test('courier can deliver order successfully when picked up, registering delivered_at and proof', function () {
    Sanctum::actingAs($this->courierUser);

    $order = Order::create([
        'client_id' => $this->client->id,
        'courier_id' => $this->courier->id,
        'package_description' => 'Medicamento',
        'package_weight_kg' => 0.3,
        'shipping_type' => 'express',
        'status' => 'picked_up',
        'picked_up_at' => now()->subMinutes(15),
        'individual_freight_price' => 14.00,
        'distance_km' => 3.5,
        'origin_address' => 'Centro',
        'dest_address' => 'Santa Cruz',
        'origin_lat' => -25.3954,
        'origin_lng' => -51.4641,
        'dest_lat' => -25.4000,
        'dest_lng' => -51.4600,
    ]);

    $response = $this->postJson("/api/orders/{$order->id}/deliver", [
        'proof_photo_url' => 'https://zarpa.com.br/proofs/recibo_123.jpg',
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'order' => [
                'id' => $order->id,
                'status' => 'delivered',
            ],
        ]);

    $order->refresh();
    expect($order->status)->toBe('delivered');
    expect($order->delivered_at)->not->toBeNull();
    expect($order->proof_photo_url)->toBe('https://zarpa.com.br/proofs/recibo_123.jpg');
});

test('PATCH /api/orders/{id}/status validates allowed status and rejects invalid jumps', function () {
    Sanctum::actingAs($this->courierUser);

    $order = Order::create([
        'client_id' => $this->client->id,
        'courier_id' => $this->courier->id,
        'package_description' => 'Ferramentas',
        'package_weight_kg' => 4.0,
        'shipping_type' => 'express',
        'status' => 'assigned',
        'individual_freight_price' => 20.00,
        'distance_km' => 5.0,
        'origin_address' => 'Centro',
        'dest_address' => 'Santana',
        'origin_lat' => -25.3954,
        'origin_lng' => -51.4641,
        'dest_lat' => -25.4100,
        'dest_lng' => -51.4500,
    ]);

    // 1. Tentar pular para delivered deve falhar com 422
    $failResponse = $this->patchJson("/api/orders/{$order->id}/status", [
        'status' => 'delivered',
    ]);
    $failResponse->assertStatus(422);

    // 2. Transicionar para picked_up com sucesso
    $successPickup = $this->patchJson("/api/orders/{$order->id}/status", [
        'status' => 'picked_up',
    ]);
    $successPickup->assertStatus(200);
    expect($order->fresh()->status)->toBe('picked_up');

    // 3. Agora transicionar para delivered com sucesso
    $successDelivered = $this->patchJson("/api/orders/{$order->id}/status", [
        'status' => 'delivered',
        'proof_photo_url' => 'https://zarpa.com.br/proofs/foto.jpg',
    ]);
    $successDelivered->assertStatus(200);
    expect($order->fresh()->status)->toBe('delivered');
});

test('courier can upload proof photo to order via POST /api/orders/{id}/proof', function () {
    Sanctum::actingAs($this->courierUser);

    $order = Order::create([
        'client_id' => $this->client->id,
        'courier_id' => $this->courier->id,
        'package_description' => 'Flores',
        'package_weight_kg' => 1.5,
        'shipping_type' => 'express',
        'status' => 'picked_up',
        'individual_freight_price' => 16.00,
        'distance_km' => 4.0,
        'origin_address' => 'Centro',
        'dest_address' => 'Vila Carli',
        'origin_lat' => -25.3954,
        'origin_lng' => -51.4641,
        'dest_lat' => -25.3850,
        'dest_lng' => -51.4800,
    ]);

    $response = $this->postJson("/api/orders/{$order->id}/proof", [
        'proof_url' => 'https://zarpa.com.br/uploads/assinatura_recebimento.png',
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'proof_photo_url' => 'https://zarpa.com.br/uploads/assinatura_recebimento.png',
        ]);

    expect($order->fresh()->proof_photo_url)->toBe('https://zarpa.com.br/uploads/assinatura_recebimento.png');
});

test('courier can consult active economic group and complete lifecycle with sequenced stops', function () {
    Sanctum::actingAs($this->courierUser);

    // 1. Criar Lote Econômico atribuído
    $group = DeliveryGroup::create([
        'courier_id' => $this->courier->id,
        'scheduled_date' => now()->format('Y-m-d'),
        'total_distance_km' => 12.0,
        'total_duration_minutes' => 35,
        'status' => 'assigned',
        'total_combined_cost' => 30.00,
        'total_savings_generated' => 10.00,
        'courier_bonus' => 5.00,
    ]);

    // 2. Criar Pedido Econômico
    $order = Order::create([
        'client_id' => $this->client->id,
        'courier_id' => $this->courier->id,
        'package_description' => 'Material de Papelaria',
        'package_weight_kg' => 2.0,
        'shipping_type' => 'economic',
        'status' => 'assigned',
        'individual_freight_price' => 20.00,
        'final_freight_price' => 17.50,
        'distance_km' => 6.0,
        'origin_address' => 'Centro',
        'dest_address' => 'Batel',
        'origin_lat' => -25.3954,
        'origin_lng' => -51.4641,
        'dest_lat' => -25.3990,
        'dest_lng' => -51.4680,
    ]);

    // 3. Criar Paradas Sequenciadas no GroupOrder
    $stop1 = GroupOrder::create([
        'delivery_group_id' => $group->id,
        'order_id' => $order->id,
        'stop_sequence' => 1,
        'stop_type' => 'pickup',
        'status' => 'pending',
        'isolated_distance_km' => 6.0,
        'shared_distance_km' => 4.0,
        'allocated_cost' => 10.00,
        'merchant_discount' => 2.50,
    ]);

    $stop2 = GroupOrder::create([
        'delivery_group_id' => $group->id,
        'order_id' => $order->id,
        'stop_sequence' => 2,
        'stop_type' => 'delivery',
        'status' => 'pending',
        'isolated_distance_km' => 6.0,
        'shared_distance_km' => 4.0,
        'allocated_cost' => 10.00,
        'merchant_discount' => 2.50,
    ]);

    // 4. Consultar GET /api/courier/active-group
    $activeGroupRes = $this->getJson('/api/courier/active-group');
    $activeGroupRes->assertStatus(200)
        ->assertJsonStructure([
            'active_group' => [
                'id',
                'status',
                'total_distance_km',
                'route_fare',
                'stop_fees',
                'courier_bonus',
                'total_earnings',
                'total_stops',
                'completed_stops_count',
                'current_stop',
                'stops',
            ],
        ]);

    $activeData = $activeGroupRes->json('active_group');
    expect($activeData['id'])->toBe($group->id);
    expect($activeData['total_stops'])->toBe(2);
    expect($activeData['completed_stops_count'])->toBe(0);
    expect($activeData['stop_fees'])->toEqual(3.00); // R$ 3,00 taxa de parada por entrega

    // 5. Iniciar jornada do lote via POST /api/courier/delivery-groups/{id}/start
    $startRes = $this->postJson("/api/courier/delivery-groups/{$group->id}/start");
    $startRes->assertStatus(200);
    expect($group->fresh()->status)->toBe('in_progress');

    // 6. Confirmar coleta da parada 1 via pickup
    $pickupRes = $this->postJson("/api/orders/{$order->id}/pickup");
    $pickupRes->assertStatus(200);
    expect($stop1->fresh()->status)->toBe('completed');

    // 7. Tentar concluir lote prematuramente com entrega pendente deve falhar
    $prematureRes = $this->postJson("/api/courier/delivery-groups/{$group->id}/complete");
    $prematureRes->assertStatus(422);

    // 8. Tentar confirmar entrega sem comprovante (foto ou código de 6 dígitos) deve falhar com 422
    $noProofRes = $this->postJson("/api/orders/{$order->id}/deliver");
    $noProofRes->assertStatus(422);

    // 9. Tentar confirmar entrega com código de 6 dígitos incorreto deve falhar com 422
    $wrongCodeRes = $this->postJson("/api/orders/{$order->id}/deliver", [
        'delivery_code' => '000000',
    ]);
    $wrongCodeRes->assertStatus(422);

    // 10. Confirmar entrega da parada 2 usando o código de 6 dígitos válido do pedido
    $order->refresh();
    expect($order->delivery_code)->toHaveLength(6);

    $deliverRes = $this->postJson("/api/orders/{$order->id}/deliver", [
        'delivery_code' => $order->delivery_code,
    ]);
    $deliverRes->assertStatus(200);
    expect($stop2->fresh()->status)->toBe('completed');
    expect($order->fresh()->proof_photo_url)->toBe("CODIGO_VALIDADO:{$order->delivery_code}");

    // 11. Concluir lote com sucesso
    $completeRes = $this->postJson("/api/courier/delivery-groups/{$group->id}/complete");
    $completeRes->assertStatus(200)
        ->assertJson([
            'success' => true,
        ]);
    expect($group->fresh()->status)->toBe('completed');
});

test('delivery_code is generated on express accept, visible to merchant and hidden from courier before delivery', function () {
    $order = Order::create([
        'client_id' => $this->client->id,
        'package_description' => 'Encomenda com Código Secreto',
        'package_weight_kg' => 1.0,
        'shipping_type' => 'express',
        'status' => 'pending',
        'individual_freight_price' => 15.00,
        'distance_km' => 3.0,
        'origin_address' => 'Centro',
        'dest_address' => 'Batel',
        'origin_lat' => -25.3954,
        'origin_lng' => -51.4641,
        'dest_lat' => -25.3990,
        'dest_lng' => -51.4680,
    ]);

    // Antes de ser aceito, delivery_code é nulo
    expect($order->fresh()->delivery_code)->toBeNull();

    // Entregador aceita a corrida expressa
    Sanctum::actingAs($this->courierUser);
    $acceptRes = $this->postJson("/api/orders/{$order->id}/accept-express");
    $acceptRes->assertStatus(200);

    // O entregador NÃO recebe o delivery_code na resposta de aceite nem no GET /orders/{id}
    expect($acceptRes->json('order.delivery_code'))->toBeNull();
    $courierShowRes = $this->getJson("/api/orders/{$order->id}");
    $courierShowRes->assertStatus(200);
    expect($courierShowRes->json('order.delivery_code'))->toBeNull();

    // O banco possui o código de 6 dígitos gerado
    $codeInDb = $order->fresh()->delivery_code;
    expect($codeInDb)->not->toBeNull();
    expect(strlen($codeInDb))->toBe(6);

    // O Lojista dono do pedido recebe o código de 6 dígitos imediatamente em my-orders e tracking
    Sanctum::actingAs($this->clientUser);
    $myOrdersRes = $this->getJson('/api/orders/my-orders');
    $myOrdersRes->assertStatus(200);
    expect($myOrdersRes->json('data.0.delivery_code'))->toBe($codeInDb);

    $trackingRes = $this->getJson("/api/orders/{$order->id}/tracking");
    $trackingRes->assertStatus(200);
    expect($trackingRes->json('delivery_code'))->toBe($codeInDb);
});
