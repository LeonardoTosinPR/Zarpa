<?php

namespace App\Services;

use App\Models\DeliveryGroup;
use App\Models\GroupOrder;
use App\Models\Order;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DynamicApportionmentService
{
    public const DEFAULT_TARIFF_PER_KM = 2.50; // R$ 2,50 por km rodado

    /**
     * Calcula o rateio dinamico cooperativo 50/50 para um conjunto de pedidos agrupados em uma rota conjunta.
     *
     * @param Collection<int, Order>|array<int, Order|array> $orders Pedidos que compoem o lote
     * @param float $jointDistanceKm Distancia real unificada percorrida no lote multi-paradas (km)
     * @param float $tariffPerKm Tarifa viaria base por km rodado (R$)
     * @return array
     */
    public function calculateApportionment(Collection|array $orders, float $jointDistanceKm, float $tariffPerKm = self::DEFAULT_TARIFF_PER_KM): array
    {
        $ordersCollection = collect($orders);
        $totalOrders = $ordersCollection->count();

        if ($totalOrders === 0) {
            return [
                'isolated_distance_km' => 0.0,
                'joint_distance_km' => round($jointDistanceKm, 2),
                'distance_saved_km' => 0.0,
                'tariff_per_km' => $tariffPerKm,
                'gross_savings' => 0.0,
                'courier_bonus' => 0.0,
                'merchants_total_discount' => 0.0,
                'total_original_cost' => 0.0,
                'total_final_cost' => 0.0,
                'order_allocations' => [],
            ];
        }

        // 1. Somatorio das distancias isoladas que seriam percorridas ponto a ponto
        $isolatedDistanceKm = (float) $ordersCollection->sum(function ($order) {
            return is_array($order) ? ($order['distance_km'] ?? 0) : ($order->distance_km ?? 0);
        });
        $isolatedDistanceKm = round($isolatedDistanceKm, 2);

        // 2. Distancia economizada com a convergencia de rotas (D_isolada - D_conjunta)
        $distanceSavedKm = max(0.0, round($isolatedDistanceKm - $jointDistanceKm, 2));

        // 3. Economia financeira bruta gerada pelo lote
        $grossSavings = round($distanceSavedKm * $tariffPerKm, 2);

        // 4. Divisao equitativa (50/50): 50% bonus ao condutor e 50% desconto aos lojistas
        $courierBonus = round($grossSavings * 0.50, 2);
        $merchantsTotalDiscount = round($grossSavings * 0.50, 2);

        // 5. Calculo preliminar do desconto proporcional por pedido
        $allocations = [];
        $allocatedDiscountsSum = 0.0;
        $maxDistance = -1.0;
        $maxDistanceOrderId = null;

        foreach ($ordersCollection as $order) {
            $orderId = is_array($order) ? $order['id'] : $order->id;
            $orderDistance = (float) (is_array($order) ? ($order['distance_km'] ?? 0) : ($order->distance_km ?? 0));
            $originalPrice = (float) (is_array($order) ? ($order['individual_freight_price'] ?? 0) : ($order->individual_freight_price ?? 0));

            // Proporcao de distancia do pedido em relacao a soma das distancias isoladas
            $ratio = $isolatedDistanceKm > 0.0
                ? ($orderDistance / $isolatedDistanceKm)
                : (1.0 / $totalOrders);

            $discount = round($merchantsTotalDiscount * $ratio, 2);
            $finalPrice = round(max(0.0, $originalPrice - $discount), 2);

            $allocations[$orderId] = [
                'order_id' => $orderId,
                'isolated_distance_km' => round($orderDistance, 2),
                'shared_distance_km' => round($jointDistanceKm * $ratio, 2),
                'ratio' => round($ratio, 4),
                'original_price' => round($originalPrice, 2),
                'discount' => $discount,
                'final_price' => $finalPrice,
            ];

            $allocatedDiscountsSum += $discount;

            if ($orderDistance > $maxDistance) {
                $maxDistance = $orderDistance;
                $maxDistanceOrderId = $orderId;
            }
        }

        // 6. Conservacao Contabil Estrita (Ajuste de residuos de centavos)
        // Garante que sum(discount_i) == merchantsTotalDiscount exatamente
        $residual = round($merchantsTotalDiscount - $allocatedDiscountsSum, 2);
        if (abs($residual) > 0.0001 && $maxDistanceOrderId !== null && isset($allocations[$maxDistanceOrderId])) {
            $adjustedDiscount = round($allocations[$maxDistanceOrderId]['discount'] + $residual, 2);
            $allocations[$maxDistanceOrderId]['discount'] = $adjustedDiscount;
            $allocations[$maxDistanceOrderId]['final_price'] = round(
                max(0.0, $allocations[$maxDistanceOrderId]['original_price'] - $adjustedDiscount),
                2
            );
        }

        $totalOriginalCost = round((float) $ordersCollection->sum(function ($order) {
            return is_array($order) ? ($order['individual_freight_price'] ?? 0) : ($order->individual_freight_price ?? 0);
        }), 2);

        $totalFinalCost = round(max(0.0, $totalOriginalCost - $merchantsTotalDiscount), 2);

        return [
            'isolated_distance_km' => $isolatedDistanceKm,
            'joint_distance_km' => round($jointDistanceKm, 2),
            'distance_saved_km' => $distanceSavedKm,
            'tariff_per_km' => $tariffPerKm,
            'gross_savings' => $grossSavings,
            'courier_bonus' => $courierBonus,
            'merchants_total_discount' => $merchantsTotalDiscount,
            'total_original_cost' => $totalOriginalCost,
            'total_final_cost' => $totalFinalCost,
            'order_allocations' => $allocations,
        ];
    }

    /**
     * Aplica e persiste o rateio dinamico 50/50 em um DeliveryGroup existente e em seus respectivos pedidos e paradas.
     *
     * @param DeliveryGroup $deliveryGroup
     * @param float $jointDistanceKm
     * @param float $tariffPerKm
     * @return array
     */
    public function applyApportionmentToGroup(DeliveryGroup $deliveryGroup, float $jointDistanceKm, float $tariffPerKm = self::DEFAULT_TARIFF_PER_KM): array
    {
        return DB::transaction(function () use ($deliveryGroup, $jointDistanceKm, $tariffPerKm) {
            $orders = $deliveryGroup->orders()->get();
            $result = $this->calculateApportionment($orders, $jointDistanceKm, $tariffPerKm);

            // Atualiza metricas consolidadas do grupo
            $deliveryGroup->update([
                'total_distance_km' => $result['joint_distance_km'],
                'total_combined_cost' => $result['total_final_cost'],
                'total_savings_generated' => $result['gross_savings'],
                'courier_bonus' => $result['courier_bonus'],
            ]);

            // Atualiza cada parada e pedido com suas cotas de rateio
            foreach ($result['order_allocations'] as $orderId => $allocation) {
                // Atualiza o pedido correspondente
                Order::where('id', $orderId)->update([
                    'final_freight_price' => $allocation['final_price'],
                ]);

                // Atualiza os registros de group_orders daquele pedido
                GroupOrder::where('delivery_group_id', $deliveryGroup->id)
                    ->where('order_id', $orderId)
                    ->update([
                        'isolated_distance_km' => $allocation['isolated_distance_km'],
                        'shared_distance_km' => $allocation['shared_distance_km'],
                        'allocated_cost' => $allocation['final_price'],
                        'merchant_discount' => $allocation['discount'],
                    ]);
            }

            return $result;
        });
    }
}
