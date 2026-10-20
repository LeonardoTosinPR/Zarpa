<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controller;
use App\Models\DeliveryGroup;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinancialController extends Controller
{
    /**
     * Retorna o extrato financeiro transparente do Lojista.
     * Exibe o total pago, frete original sem rateio, economia gerada e historico de pedidos.
     */
    public function getClientStatement(Request $request): JsonResponse
    {
        $user = $request->user();
        $client = $user->client;

        if (!$client) {
            return response()->json([
                'success' => false,
                'message' => 'Perfil de lojista nao encontrado.',
            ], 404);
        }

        $orders = Order::where('client_id', $client->id)
            ->with(['deliveryGroups'])
            ->latest('created_at')
            ->get();

        $totalOrdersCount = $orders->count();
        $economicOrdersCount = $orders->where('shipping_type', 'economic')->count();
        $expressOrdersCount = $orders->where('shipping_type', 'express')->count();

        $totalOriginalFreight = 0.0;
        $totalFinalFreight = 0.0;
        $formattedOrders = [];

        foreach ($orders as $order) {
            $origPrice = (float) $order->individual_freight_price;
            $finalPrice = $order->final_freight_price !== null
                ? (float) $order->final_freight_price
                : $origPrice;

            $discountAmount = max(0.0, round($origPrice - $finalPrice, 2));
            $discountPercent = $origPrice > 0.0
                ? round(($discountAmount / $origPrice) * 100, 1)
                : 0.0;

            $totalOriginalFreight += $origPrice;
            $totalFinalFreight += $finalPrice;

            $deliveryGroup = $order->deliveryGroups->first();

            $formattedOrders[] = [
                'id' => $order->id,
                'package_description' => $order->package_description,
                'shipping_type' => $order->shipping_type,
                'status' => $order->status,
                'individual_freight_price' => round($origPrice, 2),
                'final_freight_price' => round($finalPrice, 2),
                'discount_amount' => $discountAmount,
                'discount_percent' => $discountPercent,
                'has_batch_discount' => $discountAmount > 0.0,
                'distance_km' => (float) $order->distance_km,
                'created_at' => $order->created_at?->toISOString() ?? $order->created_at?->toDateTimeString(),
                'origin_address' => $order->origin_address,
                'dest_address' => $order->dest_address,
                'delivery_group_id' => $deliveryGroup?->id,
                'delivery_code' => $order->delivery_code,
                'proof_photo_url' => $order->proof_photo_url,
            ];
        }

        $totalSavings = max(0.0, round($totalOriginalFreight - $totalFinalFreight, 2));
        $avgSavingsPercent = $totalOriginalFreight > 0.0
            ? round(($totalSavings / $totalOriginalFreight) * 100, 1)
            : 0.0;

        return response()->json([
            'success' => true,
            'client' => [
                'id' => $client->id,
                'business_name' => $client->business_name,
            ],
            'summary' => [
                'total_orders_count' => $totalOrdersCount,
                'economic_orders_count' => $economicOrdersCount,
                'express_orders_count' => $expressOrdersCount,
                'total_original_freight' => round($totalOriginalFreight, 2),
                'total_final_freight' => round($totalFinalFreight, 2),
                'total_savings' => $totalSavings,
                'average_savings_percent' => $avgSavingsPercent,
            ],
            'orders' => $formattedOrders,
        ]);
    }

    public const TARIFF_PER_KM = 2.50;
    public const STOP_FEE_PER_DELIVERY = 3.00; // Taxa de incentivo por ponto de entrega concluído

    /**
     * Retorna o extrato financeiro detalhado do Entregador.
     * Exibe os ganhos de fretes base, bônus de produtividade por lotes, taxas por entrega e rendimento médio (R$/km).
     */
    public function getCourierStatement(Request $request): JsonResponse
    {
        $user = $request->user();
        $courier = $user->courier;

        if (!$courier) {
            return response()->json([
                'success' => false,
                'message' => 'Perfil de entregador nao encontrado.',
            ], 404);
        }

        // Lotes economicos atribuidos ou executados pelo entregador
        $deliveryGroups = DeliveryGroup::where('courier_id', $courier->id)
            ->withCount('orders')
            ->latest('scheduled_date')
            ->get();

        // Entregas expressas atribuidas ou entregues pelo entregador
        $expressOrders = Order::where('courier_id', $courier->id)
            ->where('shipping_type', 'express')
            ->latest('created_at')
            ->get();

        $totalDistanceKm = 0.0;
        $totalBaseEarnings = 0.0;
        $totalBatchBonus = 0.0;
        $totalStopFees = 0.0;

        $formattedBatches = [];
        foreach ($deliveryGroups as $group) {
            $dist = (float) $group->total_distance_km;
            $bonus = (float) $group->courier_bonus;
            $ordersCount = (int) $group->orders_count;
            
            // Remuneração do lote: Distância (R$ 2,50/km) + Taxa fixa por entrega (R$ 3,00/parada)
            $routeFare = round($dist * self::TARIFF_PER_KM, 2);
            $stopFees = round($ordersCount * self::STOP_FEE_PER_DELIVERY, 2);
            $baseEarnings = round($routeFare + $stopFees, 2);
            $totalEarnings = round($baseEarnings + $bonus, 2);

            $totalDistanceKm += $dist;
            $totalBaseEarnings += $baseEarnings;
            $totalBatchBonus += $bonus;
            $totalStopFees += $stopFees;

            $formattedBatches[] = [
                'id' => $group->id,
                'scheduled_date' => $group->scheduled_date?->toDateString(),
                'status' => $group->status,
                'total_distance_km' => $dist,
                'total_duration_minutes' => $group->total_duration_minutes,
                'orders_count' => $ordersCount,
                'route_fare' => $routeFare,
                'stop_fee_total' => $stopFees,
                'base_earnings' => $baseEarnings,
                'courier_bonus' => $bonus,
                'total_earnings' => $totalEarnings,
                'savings_generated' => (float) $group->total_savings_generated,
            ];
        }

        $formattedExpress = [];
        foreach ($expressOrders as $order) {
            $dist = (float) $order->distance_km;
            $earning = (float) ($order->final_freight_price ?? $order->individual_freight_price);

            $totalDistanceKm += $dist;
            $totalBaseEarnings += $earning;


            $formattedExpress[] = [
                'id' => $order->id,
                'dest_address' => $order->dest_address,
                'package_description' => $order->package_description,
                'status' => $order->status,
                'distance_km' => $dist,
                'freight_price' => round($earning, 2),
                'created_at' => $order->created_at?->toISOString() ?? $order->created_at?->toDateTimeString(),
            ];
        }

        $totalEarnings = round($totalBaseEarnings + $totalBatchBonus, 2);
        $totalDeliveriesCount = $expressOrders->count() + $deliveryGroups->sum('orders_count');

        $earningsPerKm = $totalDistanceKm > 0.0
            ? round($totalEarnings / $totalDistanceKm, 2)
            : 0.0;

        return response()->json([
            'success' => true,
            'courier' => [
                'id' => $courier->id,
                'cnh' => $courier->cnh,
                'vehicle_type' => $courier->vehicle_type,
            ],
            'summary' => [
                'total_deliveries_count' => $totalDeliveriesCount,
                'economic_batches_count' => $deliveryGroups->count(),
                'express_deliveries_count' => $expressOrders->count(),
                'total_distance_km' => round($totalDistanceKm, 2),
                'total_base_earnings' => round($totalBaseEarnings, 2),
                'total_stop_fees' => round($totalStopFees, 2),
                'total_batch_bonus' => round($totalBatchBonus, 2),
                'total_earnings' => $totalEarnings,
                'earnings_per_km' => $earningsPerKm,
            ],
            'batches' => $formattedBatches,
            'express_orders' => $formattedExpress,
        ]);
    }
}
