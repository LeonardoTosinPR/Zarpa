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
    public const DEFAULT_CLUSTER_RADIUS_KM = 2.0;// Raio máximo de dispersão entre nós calibrado para Guarapuava (km)
    public const MIN_COSINE_SIMILARITY = 0.20;   // Limiar mínimo de similaridade de cosseno nos vetores de direção
    public const TARIFF_PER_KM = 2.50;           // Tarifa viária base por km para cálculo econômico

    public function __construct(
        protected OsrmRoutingService $routingService,
        protected FreightCalculatorService $freightCalculator,
        protected DynamicApportionmentService $apportionmentService
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

            // 5. Cálculo do Rateio Dinâmico 50/50 via DynamicApportionmentService
            $apportionment = $this->apportionmentService->calculateApportionment(
                $clusterOrders,
                $totalDistanceKm,
                self::TARIFF_PER_KM
            );

            $grossSavings = $apportionment['gross_savings'];
            $courierBonus = $apportionment['courier_bonus'];
            $merchantsTotalDiscount = $apportionment['merchants_total_discount'];
            $totalCombinedCost = $apportionment['total_final_cost'];

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
                'apportionment' => $apportionment,
            ];

            if (!$dryRun) {
                // 7. Persistência Transacional no Banco de Dados com Rateio Consistente
                DB::transaction(function () use ($groupData, $clusterOrders, $sequencedStops, $apportionment, $assignedCourier) {
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
                        $allocation = $apportionment['order_allocations'][$order->id] ?? null;
                        $orderDiscount = $allocation ? $allocation['discount'] : 0.00;
                        $sharedDistance = $allocation ? $allocation['shared_distance_km'] : 0.00;
                        $allocatedCost = $allocation ? $allocation['final_price'] : $order->individual_freight_price;

                        GroupOrder::create([
                            'delivery_group_id' => $deliveryGroup->id,
                            'order_id' => $order->id,
                            'stop_sequence' => $index + 1,
                            'stop_type' => $stop['type'],
                            'isolated_distance_km' => $order->distance_km,
                            'shared_distance_km' => $sharedDistance,
                            'allocated_cost' => $allocatedCost,
                            'merchant_discount' => $orderDiscount,
                        ]);
                    }

                    // Atualiza status e preço final dos pedidos agrupados
                    foreach ($clusterOrders as $order) {
                        $allocation = $apportionment['order_allocations'][$order->id] ?? null;
                        $finalPrice = $allocation ? $allocation['final_price'] : $order->individual_freight_price;

                        $order->update([
                            'status' => $assignedCourier ? 'assigned' : 'pending',
                            'courier_id' => $assignedCourier?->id,
                            'final_freight_price' => $finalPrice,
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
     * Agrupa pedidos em clusters geográficos compactos respeitando limites de capacidade
     * e coerência de direção de viagem (Similaridade de Cosseno).
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
                $bestScore = PHP_FLOAT_MAX;

                foreach ($unassigned as $key => $candidate) {
                    $newWeight = $currentWeight + (float) $candidate->package_weight_kg;
                    $newVolume = $currentVolume + (float) ($candidate->package_volume_m3 ?? 0);

                    if ($newWeight > self::MAX_WEIGHT_KG || $newVolume > self::MAX_VOLUME_M3) {
                        continue;
                    }

                    // Calcula menor distância e similaridade de cosseno com os pedidos já no cluster
                    $minDistToCluster = PHP_FLOAT_MAX;
                    $avgCosineSimilarity = 0.0;
                    $comparisonCount = 0;

                    foreach ($currentCluster as $clustered) {
                        $dOrigin = $this->haversineDistance($clustered->origin_lat, $clustered->origin_lng, $candidate->origin_lat, $candidate->origin_lng);
                        $dDest = $this->haversineDistance($clustered->dest_lat, $clustered->dest_lng, $candidate->dest_lat, $candidate->dest_lng);
                        $dMin = min($dOrigin, $dDest);

                        if ($dMin < $minDistToCluster) {
                            $minDistToCluster = $dMin;
                        }

                        $cos = $this->calculateCosineSimilarity($clustered, $candidate);
                        $avgCosineSimilarity += $cos;
                        $comparisonCount++;
                    }

                    $avgCos = $comparisonCount > 0 ? ($avgCosineSimilarity / $comparisonCount) : 1.0;

                    // Rejeita candidato se estiver além do raio ou em direção oposta
                    if ($minDistToCluster > $maxRadiusKm || $avgCos < self::MIN_COSINE_SIMILARITY) {
                        continue;
                    }

                    // Score penaliza desvios direcionais (distância ponderada pelo cosseno)
                    // Quanto maior o cosseno (mais alinhado), menor a penalidade
                    $directionalPenalty = 1.0 + (1.0 - max(0.0, $avgCos)) * 0.5;
                    $score = $minDistToCluster * $directionalPenalty;

                    if ($score < $bestScore) {
                        $bestScore = $score;
                        $bestCandidateKey = $key;
                    }
                }

                if ($bestCandidateKey === null) {
                    break; // Nenhum candidato viável próximo ou na mesma direção
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
     * Calcula a similaridade de cosseno entre os vetores de deslocamento de dois pedidos.
     * Retorna valor entre -1.0 (direções opostas) e 1.0 (mesma direção exata).
     */
    public function calculateCosineSimilarity(Order $o1, Order $o2): float
    {
        $v1x = (float) $o1->dest_lng - (float) $o1->origin_lng;
        $v1y = (float) $o1->dest_lat - (float) $o1->origin_lat;

        $v2x = (float) $o2->dest_lng - (float) $o2->origin_lng;
        $v2y = (float) $o2->dest_lat - (float) $o2->origin_lat;

        $mag1 = sqrt(($v1x * $v1x) + ($v1y * $v1y));
        $mag2 = sqrt(($v2x * $v2x) + ($v2y * $v2y));

        if ($mag1 < 1e-6 || $mag2 < 1e-6) {
            return 1.0; // Deslocamento insignificante, considera alinhado
        }

        $dotProduct = ($v1x * $v2x) + ($v1y * $v2y);
        $cos = $dotProduct / ($mag1 * $mag2);

        return round(max(-1.0, min(1.0, $cos)), 4);
    }

    /**
     * Sequencia as paradas de coleta e entrega garantindo PRECEDÊNCIA ESTREITA (Pickup antes de Delivery),
     * consolidando coletas na mesma origem e aplicando otimização 2-Opt para desatar laços e cruzamentos.
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

        // Consolidação Imediata: se houver outros pedidos na MESMA origem (<= 50 metros), coleta juntos
        foreach ($pendingPickups as $orderId => $pickup) {
            if ($this->haversineDistance($currentLat, $currentLng, $pickup['lat'], $pickup['lng']) <= 0.05) {
                $sequencedStops[] = $pickup;
                $collectedOrderIds[$orderId] = true;
                unset($pendingPickups[$orderId]);
            }
        }

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

                // Consolidação de coletas adicionais no mesmo local (ex: mesmo restaurante ou shopping)
                foreach ($pendingPickups as $otherId => $otherPickup) {
                    if ($this->haversineDistance($currentLat, $currentLng, $otherPickup['lat'], $otherPickup['lng']) <= 0.05) {
                        $sequencedStops[] = $otherPickup;
                        $collectedOrderIds[$otherId] = true;
                        unset($pendingPickups[$otherId]);
                    }
                }
            } else {
                unset($pendingDeliveries[$candidateOrderId]);
            }
        }

        // Aplica Refinamento Heurístico 2-Opt com Precedência PDP para desenrolar cruzamentos viários
        return $this->optimizeRouteWithPdp2Opt($sequencedStops);
    }

    /**
     * Otimizador Heurístico 2-Opt restrito ao Problema de Coleta e Entrega (PDP 2-Opt).
     * Testa inversões de segmentos e só aceita trocas que encurtam a distância e
     * respeitam 100% das precedências (coleta sempre antes de entrega).
     *
     * @param array<array> $stops
     * @return array<array>
     */
    public function optimizeRouteWithPdp2Opt(array $stops): array
    {
        $n = count($stops);
        if ($n <= 3) {
            return $stops;
        }

        $bestRoute = $stops;
        $bestDistance = $this->calculateTotalRouteDistance($bestRoute);
        $improved = true;
        $iterations = 0;
        $maxIterations = 50; // Limite de convergência seguro

        while ($improved && $iterations < $maxIterations) {
            $improved = false;
            $iterations++;

            for ($i = 0; $i < $n - 1; $i++) {
                for ($j = $i + 1; $j < $n; $j++) {
                    // Gera rota invertendo o subsegmento entre i e j (2-opt move)
                    $newRoute = $this->apply2OptSwap($bestRoute, $i, $j);

                    // Valida se todas as coletas continuam ocorrendo antes das entregas
                    if (!$this->isValidPrecedenceSequence($newRoute)) {
                        continue;
                    }

                    $newDistance = $this->calculateTotalRouteDistance($newRoute);

                    if ($newDistance < ($bestDistance - 0.001)) {
                        $bestRoute = $newRoute;
                        $bestDistance = $newDistance;
                        $improved = true;
                        break 2; // Reinicia varredura com a nova melhor rota encontrada
                    }
                }
            }
        }

        return $bestRoute;
    }

    /**
     * Inverte a ordem do trecho entre os índices $i e $j.
     */
    protected function apply2OptSwap(array $route, int $i, int $j): array
    {
        $newRoute = [];
        $n = count($route);

        // 1. Elementos antes de i
        for ($k = 0; $k < $i; $k++) {
            $newRoute[] = $route[$k];
        }

        // 2. Elementos de i a j invertidos
        for ($k = $j; $k >= $i; $k--) {
            $newRoute[] = $route[$k];
        }

        // 3. Elementos após j
        for ($k = $j + 1; $k < $n; $k++) {
            $newRoute[] = $route[$k];
        }

        return $newRoute;
    }

    /**
     * Valida se em toda a sequência a coleta de um pedido antecede rigorosamente sua entrega.
     */
    public function isValidPrecedenceSequence(array $route): bool
    {
        $seenPickups = [];

        foreach ($route as $stop) {
            $orderId = $stop['order']->id;

            if ($stop['type'] === 'pickup') {
                $seenPickups[$orderId] = true;
            } elseif ($stop['type'] === 'delivery') {
                if (!isset($seenPickups[$orderId])) {
                    return false; // Entrega tentada antes da respectiva coleta
                }
            }
        }

        return true;
    }

    /**
     * Calcula a soma das distâncias Haversine consecutivas de uma rota de paradas.
     */
    public function calculateTotalRouteDistance(array $route): float
    {
        $totalDist = 0.0;
        $count = count($route);

        for ($k = 0; $k < $count - 1; $k++) {
            $totalDist += $this->haversineDistance(
                $route[$k]['lat'],
                $route[$k]['lng'],
                $route[$k + 1]['lat'],
                $route[$k + 1]['lng']
            );
        }

        return round($totalDist, 3);
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
