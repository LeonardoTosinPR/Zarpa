<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Courier;
use App\Models\DeliveryGroup;
use App\Models\Order;
use App\Models\User;
use App\Services\BatchClusteringService;
use App\Services\DynamicApportionmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Sprint7FinalValidationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\UserSeeder::class);
        $this->seed(\Database\Seeders\FinalValidationSeeder::class);
    }

    /**
     * Valida que o seeder da Sprint 7 inicializou todos os estabelecimentos reais de Guarapuava.
     */
    public function test_sprint_7_seeder_initializes_guarapuava_merchants_and_couriers(): void
    {
        $this->assertDatabaseHas('clients', [
            'business_name' => 'McDonald\'s Guarapuava Centro',
        ]);
        $this->assertDatabaseHas('clients', [
            'business_name' => 'Shopping Cidade dos Lagos - Hub Lojistas',
        ]);
        $this->assertDatabaseHas('clients', [
            'business_name' => 'Superpão Compre Mais Bonsucesso',
        ]);
        $this->assertDatabaseHas('clients', [
            'business_name' => 'Panificadora & Confeitaria Pão de Mel',
        ]);

        $this->assertDatabaseHas('couriers', [
            'vehicle_plate' => 'ZAR7A01', // Rafael Expresso
        ]);
    }

    /**
     * Valida o fluxo de despacho expresso com o radar do entregador central de Guarapuava.
     */
    public function test_sprint_7_express_radar_and_secure_lifecycle(): void
    {
        $courierUser = User::where('email', 'rafael.expresso@zarpa.com.br')->firstOrFail();
        $courier = Courier::where('user_id', $courierUser->id)->firstOrFail();

        // 1. Entregador consulta radar
        Sanctum::actingAs($courierUser);
        $response = $this->getJson('/api/courier/radar');

        $response->assertStatus(200);
        $orders = $response->json('orders');
        $this->assertNotEmpty($orders, 'O radar expresso deve conter pedidos pendentes em Guarapuava.');

        $targetOrderId = $orders[0]['id'];

        // 2. Aceita o pedido expresso (trava pessimista e geração de delivery_code)
        $acceptResponse = $this->postJson("/api/orders/{$targetOrderId}/accept-express");

        $acceptResponse->assertStatus(200)
            ->assertJsonPath('order.status', 'assigned');

        // Código de entrega deve permanecer oculto para o entregador
        $this->assertNull($acceptResponse->json('order.delivery_code'));

        // 3. Lojista dono do pedido visualiza o código de entrega
        $order = Order::findOrFail($targetOrderId);
        $merchantUser = User::findOrFail($order->client->user_id);

        Sanctum::actingAs($merchantUser);
        $merchantResponse = $this->getJson("/api/orders/{$targetOrderId}/tracking");

        $merchantResponse->assertStatus(200);
        $deliveryCode = $merchantResponse->json('delivery_code');
        $this->assertNotNull($deliveryCode);
        $this->assertEquals(6, strlen($deliveryCode));

        // 4. Entregador confirma coleta
        Sanctum::actingAs($courierUser);
        $pickupResponse = $this->patchJson("/api/orders/{$targetOrderId}/status", [
            'status' => 'picked_up',
        ]);

        $pickupResponse->assertStatus(200)
            ->assertJsonPath('order.status', 'picked_up');

        // 5. Entregador confirma entrega fornecendo o código correto de 6 dígitos
        $deliverResponse = $this->patchJson("/api/orders/{$targetOrderId}/status", [
            'status' => 'delivered',
            'delivery_code' => $deliveryCode,
        ]);

        $deliverResponse->assertStatus(200)
            ->assertJsonPath('order.status', 'delivered');

        $this->assertNotNull($deliverResponse->json('order.delivered_at'));
    }

    /**
     * Valida o processamento do lote econômico com agrupamento e conservação contábil do rateio 50/50.
     */
    public function test_sprint_7_economic_batch_clustering_and_accounting_conservation(): void
    {
        $batchService = app(BatchClusteringService::class);
        $apportionmentService = app(DynamicApportionmentService::class);

        // Processa os pedidos econômicos pendentes de Guarapuava
        $batchResult = $batchService->processBatch();

        $this->assertGreaterThan(0, $batchResult['groups_created'], 'Deveria formar ao menos um grupo para os pedidos econômicos de Guarapuava.');

        $groups = DeliveryGroup::with('orders')->get();
        $this->assertNotEmpty($groups);

        foreach ($groups as $group) {
            $distinctOrders = $group->orders->unique('id');
            $this->assertGreaterThanOrEqual(1, $distinctOrders->count());

            // Executa o rateio dinâmico passando os pedidos e a distância real do lote
            $apportionment = $apportionmentService->calculateApportionment(
                $distinctOrders,
                (float) $group->total_distance_km,
                BatchClusteringService::TARIFF_PER_KM
            );

            // Validações do Rateio 50/50 e Conservação Contábil Estrita
            $this->assertArrayHasKey('courier_bonus', $apportionment);
            $this->assertArrayHasKey('merchants_total_discount', $apportionment);
            $this->assertArrayHasKey('order_allocations', $apportionment);

            // Bônus do condutor equivale exatamente ao desconto total concedido aos lojistas
            $this->assertEquals($apportionment['courier_bonus'], $apportionment['merchants_total_discount']);

            // A soma dos descontos individuais equivale ao total descontado (conservação contábil)
            $sumDiscounts = round(array_sum(array_column($apportionment['order_allocations'], 'discount')), 2);
            $this->assertEquals($apportionment['merchants_total_discount'], $sumDiscounts);

            // Taxa mandatória de parada de R$ 3,00 por entrega atendida
            $stopFees = round($distinctOrders->count() * \App\Http\Controllers\Api\FinancialController::STOP_FEE_PER_DELIVERY, 2);
            $this->assertEquals($distinctOrders->count() * 3.00, $stopFees);
        }
    }
}
