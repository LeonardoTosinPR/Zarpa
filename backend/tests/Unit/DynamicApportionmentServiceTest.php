<?php

namespace Tests\Unit;

use App\Models\Order;
use App\Services\DynamicApportionmentService;
use PHPUnit\Framework\TestCase;

class DynamicApportionmentServiceTest extends TestCase
{
    protected DynamicApportionmentService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new DynamicApportionmentService();
    }

    public function test_calculates_canonical_tcc_scenario_accurately(): void
    {
        // Cenário Canônico do TCC 2:
        // 3 pedidos: 5.0 km, 6.0 km e 5.0 km (Total isolado = 16.0 km)
        // Rota conjunta calculada com OSRM = 11.0 km
        // Tarifa por km = R$ 2,50
        $orders = [
            [
                'id' => 1,
                'distance_km' => 5.0,
                'individual_freight_price' => 18.50,
            ],
            [
                'id' => 2,
                'distance_km' => 6.0,
                'individual_freight_price' => 21.00,
            ],
            [
                'id' => 3,
                'distance_km' => 5.0,
                'individual_freight_price' => 18.50,
            ],
        ];

        $result = $this->service->calculateApportionment($orders, 11.0, 2.50);

        // Asserções fundamentais do modelo do TCC
        $this->assertEquals(16.0, $result['isolated_distance_km']);
        $this->assertEquals(11.0, $result['joint_distance_km']);
        $this->assertEquals(5.0, $result['distance_saved_km']);
        $this->assertEquals(12.50, $result['gross_savings']);
        $this->assertEquals(6.25, $result['courier_bonus']);
        $this->assertEquals(6.25, $result['merchants_total_discount']);

        // Soma exata dos descontos individuais
        $allocations = $result['order_allocations'];
        $sumOfDiscounts = array_sum(array_column($allocations, 'discount'));
        $this->assertEquals(6.25, round($sumOfDiscounts, 2));

        // Pedido 1 (5/16): 6.25 * 0.3125 = 1.953125 -> 1.95
        $this->assertEquals(1.95, $allocations[1]['discount']);
        $this->assertEquals(16.55, $allocations[1]['final_price']);

        // Pedido 2 (6/16): 6.25 * 0.375 = 2.34375 -> 2.34 + ajuste de resíduo de centavo (+0.01) = 2.35
        $this->assertEquals(2.35, $allocations[2]['discount']);
        $this->assertEquals(18.65, $allocations[2]['final_price']);

        // Pedido 3 (5/16): 1.95
        $this->assertEquals(1.95, $allocations[3]['discount']);
        $this->assertEquals(16.55, $allocations[3]['final_price']);

        // Total final dos fretes com desconto aplicado
        $this->assertEquals(51.75, $result['total_final_cost']); // 58.00 original - 6.25 desconto
    }

    public function test_conserves_accounting_balance_across_arbitrary_fractions(): void
    {
        // Cenário com 4 pedidos e distâncias irregulares que geram resíduos decimais
        $orders = [
            [
                'id' => 10,
                'distance_km' => 3.33,
                'individual_freight_price' => 14.33,
            ],
            [
                'id' => 11,
                'distance_km' => 4.71,
                'individual_freight_price' => 17.78,
            ],
            [
                'id' => 12,
                'distance_km' => 2.15,
                'individual_freight_price' => 11.38,
            ],
            [
                'id' => 13,
                'distance_km' => 5.89,
                'individual_freight_price' => 20.73,
            ],
        ];

        // Rota conjunta hipotética = 9.45 km
        $result = $this->service->calculateApportionment($orders, 9.45, 2.50);

        $allocations = $result['order_allocations'];
        $sumOfDiscounts = array_sum(array_column($allocations, 'discount'));

        // A conservação estrita exige que a soma dos descontos seja rigorosamente igual a merchants_total_discount
        $this->assertEquals($result['merchants_total_discount'], round($sumOfDiscounts, 2));

        // Todos os preços finais devem ser menores ou iguais aos originais
        foreach ($allocations as $alloc) {
            $this->assertLessThanOrEqual($alloc['original_price'], $alloc['final_price']);
            $this->assertEquals(
                round($alloc['original_price'] - $alloc['discount'], 2),
                $alloc['final_price']
            );
        }
    }

    public function test_handles_no_savings_scenario_gracefully(): void
    {
        // Cenário onde a rota conjunta foi maior ou igual à isolada (sem convergência viável)
        $orders = [
            [
                'id' => 20,
                'distance_km' => 4.0,
                'individual_freight_price' => 16.00,
            ],
        ];

        $result = $this->service->calculateApportionment($orders, 5.0, 2.50);

        $this->assertEquals(0.0, $result['distance_saved_km']);
        $this->assertEquals(0.0, $result['gross_savings']);
        $this->assertEquals(0.0, $result['courier_bonus']);
        $this->assertEquals(0.0, $result['merchants_total_discount']);
        $this->assertEquals(0.0, $result['order_allocations'][20]['discount']);
        $this->assertEquals(16.00, $result['order_allocations'][20]['final_price']);
    }

    public function test_handles_empty_orders_collection(): void
    {
        $result = $this->service->calculateApportionment([], 0.0);

        $this->assertEquals(0.0, $result['isolated_distance_km']);
        $this->assertEquals(0.0, $result['gross_savings']);
        $this->assertEquals(0.0, $result['courier_bonus']);
        $this->assertEmpty($result['order_allocations']);
    }
}
