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

            // Atribuição atômica e geração do código de entrega de 6 dígitos para o lojista
            $order->update([
                'courier_id' => $courier->id,
                'status' => 'assigned',
                'assigned_at' => now(),
                'delivery_code' => $order->delivery_code ?: Order::generateDeliveryCode(),
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

    /**
     * Confirma a coleta da mercadoria pelo condutor.
     * Transiciona o status de 'assigned' para 'picked_up'.
     */
    public function pickup(int $orderId, Courier $courier): array
    {
        /** @var Order|null $order */
        $order = Order::find($orderId);

        if (!$order) {
            return [
                'success' => false,
                'status' => 404,
                'message' => 'Pedido não encontrado.',
            ];
        }

        if ($order->courier_id !== $courier->id) {
            return [
                'success' => false,
                'status' => 403,
                'message' => 'Acesso negado: este pedido não está atribuído a você.',
            ];
        }

        if ($order->status !== 'assigned') {
            return [
                'success' => false,
                'status' => 422,
                'message' => "Transição inválida: o pedido deve estar no status 'assigned' para ser coletado. Status atual: {$order->status}.",
            ];
        }

        $order->update([
            'status' => 'picked_up',
            'picked_up_at' => now(),
        ]);

        // Se pertencer a um lote econômico, sincroniza a parada de coleta
        \App\Models\GroupOrder::where('order_id', $order->id)
            ->where('stop_type', 'pickup')
            ->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);

        $group = $order->currentDeliveryGroup();
        if ($group && $group->status === 'assigned') {
            $group->update(['status' => 'in_progress']);
        }

        return [
            'success' => true,
            'status' => 200,
            'message' => 'Coleta confirmada com sucesso! Mercadoria em mãos.',
            'order' => $order->fresh(['client.user', 'courier.user']),
        ];
    }

    /**
     * Confirma a entrega final da mercadoria ao destinatário.
     * Transiciona o status de 'picked_up' para 'delivered'.
     * Exige obrigatoriamente comprovante por foto ou código de 6 dígitos válido do pedido.
     */
    public function deliver(
        int $orderId,
        Courier $courier,
        ?string $proofPhotoUrl = null,
        ?string $deliveryCode = null
    ): array {
        /** @var Order|null $order */
        $order = Order::find($orderId);

        if (!$order) {
            return [
                'success' => false,
                'status' => 404,
                'message' => 'Pedido não encontrado.',
            ];
        }

        if ($order->courier_id !== $courier->id) {
            return [
                'success' => false,
                'status' => 403,
                'message' => 'Acesso negado: este pedido não está atribuído a você.',
            ];
        }

        if ($order->status !== 'picked_up') {
            return [
                'success' => false,
                'status' => 422,
                'message' => "Transição inválida: o pedido deve ser marcado como 'picked_up' antes de ser finalizado. Status atual: {$order->status}.",
            ];
        }

        $resolvedProof = null;

        if ($deliveryCode !== null && trim($deliveryCode) !== '') {
            $cleanCode = trim($deliveryCode);
            if (empty($order->delivery_code) || $cleanCode !== (string) $order->delivery_code) {
                return [
                    'success' => false,
                    'status' => 422,
                    'message' => 'Código de confirmação de 6 dígitos inválido. Verifique o código com o destinatário ou lojista.',
                ];
            }
            $resolvedProof = $proofPhotoUrl ?: "CODIGO_VALIDADO:{$cleanCode}";
        } else {
            $resolvedProof = $proofPhotoUrl ?: $order->proof_photo_url;
            if (empty($resolvedProof)) {
                return [
                    'success' => false,
                    'status' => 422,
                    'message' => 'Comprovante de entrega obrigatório: envie uma foto do comprovante ou digite o código de 6 dígitos do pedido.',
                ];
            }
        }

        $order->update([
            'status' => 'delivered',
            'delivered_at' => now(),
            'proof_photo_url' => $resolvedProof,
        ]);

        // Se pertencer a um lote econômico, atualiza a parada de entrega e verifica se o lote terminou
        \App\Models\GroupOrder::where('order_id', $order->id)
            ->where('stop_type', 'delivery')
            ->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);

        $group = $order->currentDeliveryGroup();
        if ($group) {
            $pendingStops = \App\Models\GroupOrder::where('delivery_group_id', $group->id)
                ->where('status', '!=', 'completed')
                ->count();
            if ($pendingStops === 0) {
                $group->update(['status' => 'completed']);
            }
        }

        return [
            'success' => true,
            'status' => 200,
            'message' => 'Entrega concluída com sucesso!',
            'order' => $order->fresh(['client.user', 'courier.user']),
        ];
    }

    /**
     * Cancela a corrida em andamento pelo entregador.
     */
    public function cancelDelivery(int $orderId, Courier $courier, ?string $reason = null): array
    {
        /** @var Order|null $order */
        $order = Order::find($orderId);

        if (!$order) {
            return [
                'success' => false,
                'status' => 404,
                'message' => 'Pedido não encontrado.',
            ];
        }

        if ($order->courier_id !== $courier->id) {
            return [
                'success' => false,
                'status' => 403,
                'message' => 'Acesso negado: este pedido não está atribuído a você.',
            ];
        }

        if ($order->status === 'delivered') {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Não é possível cancelar uma entrega que já foi finalizada.',
            ];
        }

        // Se a corrida for expressa e ainda não tiver sido coletada, volta para pending para outro condutor poder atender
        if ($order->shipping_type === 'express' && $order->status === 'assigned') {
            $order->update([
                'courier_id' => null,
                'status' => 'pending',
                'assigned_at' => null,
                'delivery_code' => null,
            ]);
            OrderRejection::firstOrCreate([
                'order_id' => $orderId,
                'courier_id' => $courier->id,
            ], [
                'reason' => $reason ?? 'Desistência de corrida em andamento',
            ]);
        } else {
            $order->update([
                'status' => 'canceled',
            ]);
        }

        return [
            'success' => true,
            'status' => 200,
            'message' => 'Corrida cancelada com sucesso.',
            'order' => $order->fresh(['client.user', 'courier.user']),
        ];
    }
}
