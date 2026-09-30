<?php

namespace App\Services;

use App\Models\Courier;
use App\Models\Order;
use App\Models\OrderRejection;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class CourierDispatchService
{
    /**
     * Retorna os pedidos expressos pendentes dentro do raio geoespacial do condutor.
     * Utiliza PostGIS ST_DWithin projetado em geography (metros).
     * Exclui pedidos que o entregador já recusou anteriormente.
     *
     * @param Courier $courier
     * @return Collection
     */
    public function getAvailableExpressOrders(Courier $courier): Collection
    {
        if (!$courier->is_online || !$courier->is_active) {
            return new Collection();
        }

        if ($courier->current_lat === null || $courier->current_lng === null) {
            return new Collection();
        }

        $courierLat = (float) $courier->current_lat;
        $courierLng = (float) $courier->current_lng;
        $radiusKm = (float) ($courier->cluster_radius_km ?? 5.0);
        $radiusMeters = $radiusKm * 1000.0;

        $rejectedIds = OrderRejection::where('courier_id', $courier->id)->pluck('order_id')->toArray();

        $query = Order::with(['client.user'])
            ->pending()
            ->express()
            ->whereNotNull('origin_location');

        if (!empty($rejectedIds)) {
            $query->whereNotIn('orders.id', $rejectedIds);
        }

        return $query->select('orders.*')
            ->selectRaw('
                ROUND(
                    (ST_Distance(
                        origin_location::geography,
                        ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
                    ) / 1000.0)::numeric,
                    2
                ) as pickup_distance_km
            ', [$courierLng, $courierLat])
            ->whereRaw('
                ST_DWithin(
                    origin_location::geography,
                    ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
                    ?
                )
            ', [$courierLng, $courierLat, $radiusMeters])
            ->orderBy('pickup_distance_km', 'asc')
            ->get();
    }

    /**
     * Aceita uma corrida expressa com proteção transacional de concorrência (Pessimistic Lock).
     * Retorna 409 Conflict se a corrida já tiver sido capturada por outro entregador.
     *
     * @param int $orderId
     * @param Courier $courier
     * @return array
     */
    public function acceptExpressOrder(int $orderId, Courier $courier): array
    {
        return DB::transaction(function () use ($orderId, $courier) {
            // Trava pessimista no registro do pedido no PostgreSQL
            /** @var Order|null $order */
            $order = Order::where('id', $orderId)
                ->lockForUpdate()
                ->first();

            if (!$order) {
                return [
                    'success' => false,
                    'status' => 404,
                    'message' => 'Pedido não encontrado.',
                ];
            }

            // Valida se o pedido ainda está elegível e pendente
            if ($order->status !== 'pending' || $order->shipping_type !== 'express') {
                return [
                    'success' => false,
                    'status' => 409,
                    'error_code' => 'ORDER_ALREADY_CLAIMED',
                    'message' => 'Ops! Esta corrida já foi aceita por outro condutor parceiro.',
                ];
            }

            // Atribuição atômica
            $order->update([
                'courier_id' => $courier->id,
                'status' => 'assigned',
            ]);

            return [
                'success' => true,
                'status' => 200,
                'message' => 'Corrida expressa aceita com sucesso!',
                'order' => $order->fresh(['client.user']),
            ];
        });
    }

    /**
     * Registra a recusa do entregador para uma oferta expressa.
     * O pedido não será mais exibido no radar deste condutor.
     *
     * @param int $orderId
     * @param Courier $courier
     * @param string|null $reason
     * @return array
     */
    public function rejectExpressOrder(int $orderId, Courier $courier, ?string $reason = null): array
    {
        $order = Order::find($orderId);

        if (!$order) {
            return [
                'success' => false,
                'status' => 404,
                'message' => 'Pedido não encontrado.',
            ];
        }

        OrderRejection::firstOrCreate([
            'order_id' => $orderId,
            'courier_id' => $courier->id,
        ], [
            'reason' => $reason ?? 'Recusado pelo entregador no radar',
        ]);

        return [
            'success' => true,
            'status' => 200,
            'message' => 'Chamado recusado com sucesso. Não será mais exibido para você.',
        ];
    }
}
