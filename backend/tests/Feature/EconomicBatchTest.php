<?php

use App\Models\Client;
use App\Models\Courier;
use App\Models\DeliveryGroup;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // 1. Cria Lojista
    $this->merchantUser = User::create([
        'name' => 'Mercado Central User',
        'email' => 'lojista.batch.feat@zarpa.com.br',
        'password' => bcrypt('secret123'),
        'role' => 'client',
        'phone' => '(42) 99888-7777',
    ]);
    $this->client = Client::create([
        'user_id' => $this->merchantUser->id,
        'business_name' => 'Mercado Central',
        'cnpj_cpf' => '11.222.333/0001-44',
        'default_address' => 'Rua Saldanha Marinho, 1200 - Centro',
        'default_lat' => -25.3905,
        'default_lng' => -51.4628,
    ]);

    // 2. Cria Entregador
    $this->courierUser = User::create([
        'name' => 'Carlos Entregador Batch',
        'email' => 'courier.batch.feat@zarpa.com.br',
        'password' => bcrypt('secret123'),
        'role' => 'courier',
        'phone' => '(42) 99777-8888',
    ]);
    $this->courier = Courier::create([
        'user_id' => $this->courierUser->id,
        'cnh' => '12345678901',
        'vehicle_type' => 'motorcycle',
        'vehicle_plate' => 'ZAR4P99',
        'current_lat' => -25.3950,
        'current_lng' => -51.4600,
        'cluster_radius_km' => 10.0,
        'is_online' => true,
        'is_active' => true,
    ]);

    // 3. Cria 3 pedidos econômicos pendentes
    for ($i = 1; $i <= 3; $i++) {
        Order::create([
            'client_id' => $this->client->id,
            'package_description' => "Pedido Economico #{$i}",
            'package_weight_kg' => 2.0,
            'package_volume_m3' => 0.01,
            'shipping_type' => 'economic',
            'status' => 'pending',
            'is_anchor' => ($i === 1),
            'individual_freight_price' => 16.00,
            'distance_km' => 4.5,
            'estimated_duration_minutes' => 12,
            'origin_address' => 'Centro',
            'dest_address' => 'Bonsucesso',
            'origin_lat' => -25.3905,
            'origin_lng' => -51.4628,
            'dest_lat' => -25.3582,
            'dest_lng' => -51.4682,
        ]);
    }

    // 4. Cria Admin
    $this->adminUser = User::create([
        'name' => 'Admin Zarpa',
        'email' => 'admin.batch.feat@zarpa.com.br',
        'password' => bcrypt('secret123'),
        'role' => 'admin',
        'phone' => '(42) 99999-0000',
    ]);
});

test('artisan command zarpa:process-economic-batch executes successfully and persists groups', function () {
    $this->artisan('zarpa:process-economic-batch')
        ->assertSuccessful();

    expect(DeliveryGroup::count())->toBeGreaterThan(0);

    $group = DeliveryGroup::first();
    expect($group)->not->toBeNull()
        ->and($group->groupOrders()->count())->toBe(6); // 3 coletas + 3 entregas
});

test('non-admin user receives 403 when trying to trigger batch via POST /api/batch/process-economic', function () {
    $response = $this->actingAs($this->merchantUser, 'sanctum')
        ->postJson('/api/batch/process-economic', [
            'radius' => 8.0,
            'dry_run' => false,
        ]);

    $response->assertStatus(403);
});

test('admin user can trigger batch via POST /api/batch/process-economic', function () {
    $response = $this->actingAs($this->adminUser, 'sanctum')
        ->postJson('/api/batch/process-economic', [
            'radius' => 8.0,
            'dry_run' => false,
        ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'success',
            'message',
            'groups_created',
            'orders_processed',
            'total_savings_generated',
            'groups',
        ]);

    expect(DeliveryGroup::count())->toBeGreaterThan(0);
});

test('courier can view assigned delivery groups via GET /api/courier/delivery-groups', function () {
    // Processa lote para persistir dados
    $this->artisan('zarpa:process-economic-batch');

    $response = $this->actingAs($this->courierUser, 'sanctum')
        ->getJson('/api/courier/delivery-groups');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'courier_id',
            'total_groups',
            'groups',
        ]);
});

test('courier can view delivery group details and sequenced stops via GET /api/courier/delivery-groups/{id}', function () {
    $this->artisan('zarpa:process-economic-batch');
    $group = DeliveryGroup::first();

    $response = $this->actingAs($this->courierUser, 'sanctum')
        ->getJson("/api/courier/delivery-groups/{$group->id}");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'id',
            'scheduled_date',
            'total_distance_km',
            'total_duration_minutes',
            'status',
            'courier_bonus',
            'total_stops',
            'stops' => [
                '*' => [
                    'id',
                    'stop_sequence',
                    'stop_type',
                    'order_id',
                    'address',
                    'lat',
                    'lng',
                ],
            ],
        ]);
});
