<?php

namespace App\Services;

use App\Models\Courier;
use App\Models\DeliveryGroup;
use App\Models\GroupOrder;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BatchClusteringService
{
    // Restrições de Capacidade e Agrupamento
    public const MAX_ORDERS_PER_GROUP = 5;       // Máximo de pedidos por lote
    public const MAX_WEIGHT_KG = 20.00;          // Capacidade máxima de carga (kg)
    public const MAX_VOLUME_M3 = 0.1500;         // Volume máximo do baú/mochila (m³)
    public const DEFAULT_CLUSTER_RADIUS_KM = 6.0;// Raio máximo de dispersão entre nós (km)
    public const TARIFF_PER_KM = 2.50;           // Tarifa viária base por km para cálculo econômico

    public function __construct(
        protected OsrmRoutingService $routingService,
        protected FreightCalculatorService $freightCalculator
    ) {}

    /**
     * Executa o processo de clusterização e formação de lotes econômicos.
     *
     * @param string|null $scheduledDate Data agendada para a entrega (formato Y-m-d)
     * @param float $clusterRadiusKm Raio máximo para agrupamento de pedidos vizinhos
     * @param bool $dryRun Se true, simula os agrupamentos sem persistir no banco
     * @return array
     */
    public function processBatch(?string $scheduledDate = null, float $clusterRadiusKm = self::DEFAULT_CLUSTER_RADIUS_KM, bool $dryRun = false): array
    {
        $date = $scheduledDate ? Carbon::parse($scheduledDate)->toDateString() : Carbon::tomorrow()->toDateString();

        // 1. Coleta todos os pedidos econômicos pendentes
        $pendingOrders = Order::query()
            ->where('shipping_type', 'economic')
            ->where('status', 'pending')
            ->orderByDesc('is_anchor') // Âncoras primeiro
            ->orderBy('created_at')
            ->get();

        if ($pendingOrders->isEmpty()) {
            return [
                'success' => true,
                'message' => 'Nenhum pedido econômico pendente para processamento.',
                'date' => $date,
                'groups_created' => 0,
                'orders_processed' => 0,
                'total_savings_generated' => 0.00,
                'groups' => [],
            ];
        }

        // 2. Agrupamento em Clusters por Proximidade e Restrições de Capacidade
        $clusters = $this->formClusters($pendingOrders, $clusterRadiusKm);

        $createdGroups = [];
        $totalSavings = 0.00;
        $totalOrdersProcessed = 0;
        $assignedCourierIds = [];

        foreach ($clusters as $clusterOrders) {
            // 3. Sequenciamento Ótimo de Paradas com Precedência Estrita (Coleta antes de Entrega)
            $sequencedStops = $this->sequenceStopsWithPrecedence($clusterOrders);

            // 4. Roteamento Multi-Pontos com OSRM
            $waypoints = array_map(fn($stop) => [
                'lat' => $stop['lat'],
                'lng' => $stop['lng'],
            ], $sequencedStops);

            $multiStopRoute = $this->routingService->calculateMultiStopRoute($waypoints);
            $totalDistanceKm = (float) ($multiStopRoute['distance_km'] ?? 0);
            $totalDurationMin = (int) ($multiStopRoute['duration_minutes'] ?? 0);
            $routeGeometry = $multiStopRoute['polyline_geometry'] ?? null;

            // 5. Métricas Financeiras e Rateio Provisório
            $isolatedDistanceSum = (float) $clusterOrders->sum('distance_km');
            $isolatedCostSum = (float) $clusterOrders->sum('individual_freight_price');

            // Economia Bruta gerada pela rota compartilhada
            $distanceSavedKm = max(0.0, $isolatedDistanceSum - $totalDistanceKm);
            $grossSavings = round($distanceSavedKm * self::TARIFF_PER_KM, 2);

            // 50% de bônus para o entregador e 50% de desconto para os lojistas
            $courierBonus = round($grossSavings * 0.50, 2);
            $merchantsTotalDiscount = round($grossSavings * 0.50, 2);
            $totalCombinedCost = round(max(0.0, $isolatedCostSum - $merchantsTotalDiscount), 2);

            // 6. Alocação de Condutor Parceiro (Distribuído entre os pólos disponíveis)
            $assignedCourier = $this->findBestCourierForCluster($clusterOrders, $assignedCourierIds);
            if ($assignedCourier) {
                $assignedCourierIds[] = $assignedCourier->id;
            }

            $groupData = [
                'courier_id' => $assignedCourier?->id,
                'courier_name' => $assignedCourier?->user?->name,
                'scheduled_date' => $date,
                'total_distance_km' => $totalDistanceKm,
                'total_duration_minutes' => $totalDurationMin,
                'status' => $assignedCourier ? 'assigned' : 'created',
                'total_combined_cost' => $totalCombinedCost,
                'total_savings_generated' => $grossSavings,
                'courier_bonus' => $courierBonus,
                'route_geometry' => $routeGeometry,
                'orders_count' => $clusterOrders->count(),
                'stops_count' => count($sequencedStops),
                'stops' => $sequencedStops,
            ];

            if (!$dryRun) {
                // 7. Persistência Transacional no Banco de Dados
                DB::transaction(function () use ($groupData, $clusterOrders, $sequencedStops, $isolatedDistanceSum, $merchantsTotalDiscount, $assignedCourier) {
                    $deliveryGroup = DeliveryGroup::create([
                        'courier_id' => $groupData['courier_id'],
                        'scheduled_date' => $groupData['scheduled_date'],
                        'total_distance_km' => $groupData['total_distance_km'],
                        'total_duration_minutes' => $groupData['total_duration_minutes'],
                        'status' => $groupData['status'],
                        'total_combined_cost' => $groupData['total_combined_cost'],
                        'total_savings_generated' => $groupData['total_savings_generated'],
                        'courier_bonus' => $groupData['courier_bonus'],
                        'route_geometry' => $groupData['route_geometry'],
                    ]);

                    foreach ($sequencedStops as $index => $stop) {
                        $order = $stop['order'];
                        $ratio = $isolatedDistanceSum > 0 ? ($order->distance_km / $isolatedDistanceSum) : (1 / $clusterOrders->count());
                        $orderDiscount = round($merchantsTotalDiscount * $ratio, 2);

                        GroupOrder::create([
                            'delivery_group_id' => $deliveryGroup->id,
                            'order_id' => $order->id,
                            'stop_sequence' => $index + 1,
                            'stop_type' => $stop['type'],
                            'isolated_distance_km' => $order->distance_km,
                            'shared_distance_km' => round($groupData['total_distance_km'] * $ratio, 2),
                            'allocated_cost' => round($order->individual_freight_price - $orderDiscount, 2),
                            'merchant_discount' => $orderDiscount,
                        ]);
                    }

                    // Atualiza status dos pedidos agrupados
                    foreach ($clusterOrders as $order) {
                        $order->update([
                            'status' => $assignedCourier ? 'assigned' : 'pending',
                            'courier_id' => $assignedCourier?->id,
                            'final_freight_price' => round($order->individual_freight_price - ($merchantsTotalDiscount * ($isolatedDistanceSum > 0 ? ($order->distance_km / $isolatedDistanceSum) : 0)), 2),
                        ]);
                    }

                    $groupData['id'] = $deliveryGroup->id;
                });
            }

            $createdGroups[] = $groupData;
            $totalSavings += $grossSavings;
            $totalOrdersProcessed += $clusterOrders->count();
        }

        return [
            'success' => true,
            'message' => "Processamento concluído com sucesso. {$totalOrdersProcessed} pedidos organizados em " . count($createdGroups) . " lotes.",
            'date' => $date,
            'dry_run' => $dryRun,
            'groups_created' => count($createdGroups),
            'orders_processed' => $totalOrdersProcessed,
            'total_savings_generated' => round($totalSavings, 2),
            'groups' => $createdGroups,
        ];
    }

    /**
     * Agrupa pedidos em clusters geográficos compactos respeitando limites de capacidade.
     *
     * @param Collection<int, Order> $orders
     * @param float $maxRadiusKm
     * @return array<Collection<int, Order>>
     */
    protected function formClusters(Collection $orders, float $maxRadiusKm): array
    {
        $clusters = [];
        $unassigned = $orders->values();

        while ($unassigned->isNotEmpty()) {
            // Seleciona o primeiro pedido (preferencialmente âncora) como semente do cluster
            $seed = $unassigned->shift();
            $currentCluster = collect([$seed]);
            $currentWeight = (float) $seed->package_weight_kg;
            $currentVolume = (float) ($seed->package_volume_m3 ?? 0);

            while ($currentCluster->count() < self::MAX_ORDERS_PER_GROUP && $unassigned->isNotEmpty()) {
                $bestCandidateKey = null;
                $bestDistance = PHP_FLOAT_MAX;

                foreach ($unassigned as $key => $candidate) {
                    $newWeight = $currentWeight + (float) $candidate->package_weight_kg;
                    $newVolume = $currentVolume + (float) ($candidate->package_volume_m3 ?? 0);

                    if ($newWeight > self::MAX_WEIGHT_KG || $newVolume > self::MAX_VOLUME_M3) {
                        continue;
                    }

                    // Calcula menor distância do candidato aos nós do cluster atual
                    $minDistToCluster = PHP_FLOAT_MAX;
                    foreach ($currentCluster as $clustered) {
                        $dOrigin = $this->haversineDistance($clustered->origin_lat, $clustered->origin_lng, $candidate->origin_lat, $candidate->origin_lng);
                        $dDest = $this->haversineDistance($clustered->dest_lat, $clustered->dest_lng, $candidate->dest_lat, $candidate->dest_lng);
                        $dMin = min($dOrigin, $dDest);
                        if ($dMin < $minDistToCluster) {
                            $minDistToCluster = $dMin;
                        }
                    }

                    if ($minDistToCluster <= $maxRadiusKm && $minDistToCluster < $bestDistance) {
                        $bestDistance = $minDistToCluster;
                        $bestCandidateKey = $key;
                    }
                }

                if ($bestCandidateKey === null) {
                    break; // Nenhum candidato viável próximo
                }

                $chosen = $unassigned->pull($bestCandidateKey);
                $currentCluster->push($chosen);
                $currentWeight += (float) $chosen->package_weight_kg;
                $currentVolume += (float) ($chosen->package_volume_m3 ?? 0);
            }

            $clusters[] = $currentCluster;
            $unassigned = $unassigned->values();
        }

        return $clusters;
    }

    /**
     * Sequencia as paradas de coleta e entrega garantindo PRECEDÊNCIA ESTREITA (Pickup antes de Delivery).
     *
     * @param Collection<int, Order> $orders
     * @return array<array>
     */
    public function sequenceStopsWithPrecedence(Collection $orders): array
    {
        if ($orders->isEmpty()) {
            return [];
        }

        // Constrói lista de tarefas pendentes
        $pendingPickups = [];
        $pendingDeliveries = [];

        foreach ($orders as $order) {
            $pendingPickups[$order->id] = [
                'order' => $order,
                'type' => 'pickup',
                'lat' => (float) $order->origin_lat,
                'lng' => (float) $order->origin_lng,
                'address' => $order->origin_address,
                'label' => 'Coleta: ' . ($order->client->business_name ?? 'Lojista'),
            ];

            $pendingDeliveries[$order->id] = [
                'order' => $order,
                'type' => 'delivery',
                'lat' => (float) $order->dest_lat,
                'lng' => (float) $order->dest_lng,
                'address' => $order->dest_address,
                'label' => 'Entrega: ' . $order->package_description,
            ];
        }

        $collectedOrderIds = [];
        $sequencedStops = [];

        // Ponto de partida: Coleta do primeiro pedido (âncora)
        $firstOrder = $orders->first();
        $currentStop = $pendingPickups[$firstOrder->id];
        $sequencedStops[] = $currentStop;
        $collectedOrderIds[$firstOrder->id] = true;
        unset($pendingPickups[$firstOrder->id]);

        $currentLat = $currentStop['lat'];
        $currentLng = $currentStop['lng'];

        $totalStops = $orders->count() * 2;

        while (count($sequencedStops) < $totalStops) {
            $bestCandidate = null;
            $bestDistance = PHP_FLOAT_MAX;
            $candidateType = null;
            $candidateOrderId = null;

            // 1. Avalia coletas ainda não realizadas
            foreach ($pendingPickups as $orderId => $pickup) {
                $dist = $this->haversineDistance($currentLat, $currentLng, $pickup['lat'], $pickup['lng']);
                if ($dist < $bestDistance) {
                    $bestDistance = $dist;
                    $bestCandidate = $pickup;
                    $candidateType = 'pickup';
                    $candidateOrderId = $orderId;
                }
            }

            // 2. Avalia entregas cujos pedidos JÁ FORAM COLETADOS
            foreach ($pendingDeliveries as $orderId => $delivery) {
                if (isset($collectedOrderIds[$orderId])) {
                    $dist = $this->haversineDistance($currentLat, $currentLng, $delivery['lat'], $delivery['lng']);
                    if ($dist < $bestDistance) {
                        $bestDistance = $dist;
                        $bestCandidate = $delivery;
                        $candidateType = 'delivery';
                        $candidateOrderId = $orderId;
                    }
                }
            }

            if ($bestCandidate === null) {
                break;
            }

            $sequencedStops[] = $bestCandidate;
            $currentLat = $bestCandidate['lat'];
            $currentLng = $bestCandidate['lng'];

            if ($candidateType === 'pickup') {
                $collectedOrderIds[$candidateOrderId] = true;
                unset($pendingPickups[$candidateOrderId]);
            } else {
                unset($pendingDeliveries[$candidateOrderId]);
            }
        }

        return $sequencedStops;
    }

    /**
     * Localiza o condutor parceiro mais adequado para assumir o cluster em Guarapuava.
     *
     * @param Collection<int, Order> $orders
     * @param array<int> $excludeCourierIds
     */
    protected function findBestCourierForCluster(Collection $orders, array $excludeCourierIds = []): ?Courier
    {
        $firstOrder = $orders->first();
        if (!$firstOrder) {
            return null;
        }

        $originLat = (float) $firstOrder->origin_lat;
        $originLng = (float) $firstOrder->origin_lng;

        // Busca entregadores ativos e disponíveis que ainda não foram alocados nesta rodada
        $couriers = Courier::query()
            ->where('is_active', true)
            ->whereNotNull('current_lat')
            ->whereNotNull('current_lng')
            ->when(!empty($excludeCourierIds), function ($q) use ($excludeCourierIds) {
                $q->whereNotIn('id', $excludeCourierIds);
            })
            ->get();

        // Se todos os entregadores ativos já foram alocados e ainda há clusters restantes, permite reuso apenas entre os ativos
        if ($couriers->isEmpty()) {
            $couriers = Courier::query()
                ->where('is_active', true)
                ->whereNotNull('current_lat')
                ->whereNotNull('current_lng')
                ->get();
        }

        if ($couriers->isEmpty()) {
            return null;
        }

        return $couriers->sortBy(function (Courier $courier) use ($originLat, $originLng) {
            return $this->haversineDistance($originLat, $originLng, (float) $courier->current_lat, (float) $courier->current_lng);
        })->first();
    }

    /**
     * Distância Haversine direta em quilômetros.
     */
    public function haversineDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadiusKm = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return round($earthRadiusKm * $c, 3);
    }
}
