<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controller;
use App\Models\Courier;
use App\Models\DeliveryGroup;
use App\Models\Order;
use App\Services\BatchClusteringService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DeliveryGroupController extends Controller
{
    public function __construct(
        protected BatchClusteringService $clusteringService
    ) {}

    /**
     * Dispara o processamento do lote econômico sob demanda (para testes manuais ou agendamento).
     * POST /api/batch/process-economic
     */
    public function processBatch(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || $user->role !== 'admin') {
            return response()->json([
                'message' => 'Acesso não autorizado. Apenas administradores podem acionar a distribuição do lote econômico.',
            ], 403);
        }

        $validated = $request->validate([
            'scheduled_date' => 'nullable|date_format:Y-m-d',
            'radius' => 'nullable|numeric|min:1|max:50',
            'dry_run' => 'nullable|boolean',
        ]);

        $date = $validated['scheduled_date'] ?? null;
        $radius = (float) ($validated['radius'] ?? BatchClusteringService::DEFAULT_CLUSTER_RADIUS_KM);
        $dryRun = (bool) ($validated['dry_run'] ?? false);

        $result = $this->clusteringService->processBatch($date, $radius, $dryRun);

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    /**
     * Retorna resumo dos pedidos econômicos que aguardam o processamento do lote noturno.
     * GET /api/batch/summary
     */
    public function getPendingSummary(): JsonResponse
    {
        $pendingCount = Order::where('shipping_type', 'economic')
            ->where('status', 'pending')
            ->count();

        $totalWeight = (float) Order::where('shipping_type', 'economic')
            ->where('status', 'pending')
            ->sum('package_weight_kg');

        $activeGroups = DeliveryGroup::with(['courier.user', 'orders'])
            ->latest()
            ->take(5)
            ->get();

        return response()->json([
            'pending_economic_orders' => $pendingCount,
            'total_weight_kg' => round($totalWeight, 2),
            'next_batch_scheduled' => Carbon::tomorrow()->format('Y-m-d 02:00'),
            'recent_groups' => $activeGroups,
        ]);
    }

    /**
     * Lista lotes econômicos atribuídos ou disponíveis para o condutor autenticado.
     * GET /api/courier/delivery-groups
     */
    public function courierGroups(Request $request): JsonResponse
    {
        $user = Auth::user();
        $courier = Courier::where('user_id', $user->id)->first();

        // Se for admin sem perfil de condutor
        if (!$courier && $user->hasFullAccess()) {
            $groups = DeliveryGroup::with(['orders.client.user', 'groupOrders.order.client.user', 'courier.user'])
                ->has('orders')
                ->orderByDesc('scheduled_date')
                ->orderByDesc('id')
                ->get();
                
            return response()->json([
                'courier_id' => null,
                'total_groups' => $groups->count(),
                'groups' => $groups,
            ]);
        }

        if (!$courier) {
            return response()->json(['message' => 'Perfil de condutor não localizado.'], 403);
        }

        // Busca lotes atribuídos a este condutor ou criados e aguardando condutor (que possuam pedidos)
        $groups = DeliveryGroup::with(['orders.client.user', 'groupOrders.order.client.user'])
            ->has('orders')
            ->where(function ($query) use ($courier) {
                $query->where('courier_id', $courier->id)
                      ->orWhereNull('courier_id');
            })
            ->orderByDesc('scheduled_date')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'courier_id' => $courier->id,
            'total_groups' => $groups->count(),
            'groups' => $groups,
        ]);
    }

    /**
     * Retorna detalhes completos de um lote específico com todas as paradas sequenciadas.
     * GET /api/courier/delivery-groups/{id}
     */
    public function show(int $id): JsonResponse
    {
        $group = DeliveryGroup::with([
            'courier.user',
            'groupOrders.order.client.user',
            'orders.client.user',
        ])->find($id);

        if (!$group) {
            return response()->json(['message' => 'Lote econômico não encontrado.'], 404);
        }

        return response()->json($this->formatGroupDetails($group));
    }

    /**
     * Retorna o lote econômico ativo para o condutor autenticado.
     * GET /api/courier/active-group
     */
    public function activeGroup(Request $request): JsonResponse
    {
        $user = Auth::user();
        $courier = Courier::where('user_id', $user->id)->first();

        if (!$courier && !$user->hasFullAccess()) {
            return response()->json(['message' => 'Perfil de condutor não localizado.'], 403);
        }

        $courierId = $courier?->id;

        $query = DeliveryGroup::with([
            'courier.user',
            'groupOrders.order.client.user',
            'orders.client.user',
        ])->has('orders');

        if ($courierId) {
            $query->where(function ($q) use ($courierId) {
                $q->where('courier_id', $courierId)
                  ->orWhereNull('courier_id');
            });
        }

        // Prioridade 1: lote 'in_progress'
        $group = (clone $query)->where('status', 'in_progress')->first();

        // Prioridade 2: lote 'assigned'
        if (!$group) {
            $group = (clone $query)->where('status', 'assigned')->latest('scheduled_date')->first();
        }

        if (!$group) {
            return response()->json([
                'active_group' => null,
                'message' => 'Nenhum lote econômico ativo no momento.',
            ], 200);
        }

        return response()->json([
            'active_group' => $this->formatGroupDetails($group),
        ]);
    }

    /**
     * Inicia a jornada de execução do lote pelo condutor.
     * POST /api/courier/delivery-groups/{id}/start
     */
    public function startGroup(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();
        $courier = Courier::where('user_id', $user->id)->first();

        $group = DeliveryGroup::find($id);
        if (!$group) {
            return response()->json(['message' => 'Lote econômico não encontrado.'], 404);
        }

        if ($courier && $group->courier_id && $group->courier_id !== $courier->id && !$user->hasFullAccess()) {
            return response()->json(['message' => 'Acesso negado: este lote pertence a outro condutor.'], 403);
        }

        // Se o lote ainda não tinha courier atribuído, atribui a este condutor
        if ($courier && !$group->courier_id) {
            $group->courier_id = $courier->id;
        }

        if ($group->status === 'completed' || $group->status === 'canceled') {
            return response()->json([
                'message' => "Lote econômico não pode ser iniciado porque já está com status '{$group->status}'.",
            ], 422);
        }

        $group->status = 'in_progress';
        $group->save();

        return response()->json([
            'success' => true,
            'message' => 'Jornada do lote econômico iniciada com sucesso! Boa rota.',
            'group' => $this->formatGroupDetails($group->fresh([
                'courier.user',
                'groupOrders.order.client.user',
                'orders.client.user',
            ])),
        ]);
    }

    /**
     * Conclui a execução do lote econômico.
     * POST /api/courier/delivery-groups/{id}/complete
     */
    public function completeGroup(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();
        $courier = Courier::where('user_id', $user->id)->first();

        $group = DeliveryGroup::find($id);
        if (!$group) {
            return response()->json(['message' => 'Lote econômico não encontrado.'], 404);
        }

        if ($courier && $group->courier_id !== $courier->id && !$user->hasFullAccess()) {
            return response()->json(['message' => 'Acesso negado: este lote pertence a outro condutor.'], 403);
        }

        // Verifica se existem pedidos não entregues
        $pendingOrders = $group->orders()->where('orders.status', '!=', 'delivered')->count();
        if ($pendingOrders > 0) {
            return response()->json([
                'message' => "Não é possível concluir o lote: ainda restam {$pendingOrders} entregas pendentes.",
            ], 422);
        }

        $group->status = 'completed';
        $group->save();

        return response()->json([
            'success' => true,
            'message' => 'Parabéns! Todas as entregas do lote econômico foram concluídas.',
            'group' => $this->formatGroupDetails($group->fresh([
                'courier.user',
                'groupOrders.order.client.user',
                'orders.client.user',
            ])),
        ]);
    }

    /**
     * Formata os dados consolidados do lote e suas paradas ordenadas cronologicamente.
     */
    protected function formatGroupDetails(DeliveryGroup $group): array
    {
        $deliveriesCount = $group->groupOrders->where('stop_type', 'delivery')->count();
        $ordersCount = $deliveriesCount > 0 ? $deliveriesCount : $group->orders->pluck('id')->unique()->count();
        $routeFare = round((float) $group->total_distance_km * 2.50, 2);
        $stopFees = round($ordersCount * 3.00, 2); // Regra Zarpa: R$ 3,00 por entrega atendida
        $courierBonus = (float) $group->courier_bonus;
        $totalEarnings = round($routeFare + $stopFees + $courierBonus, 2);

        $formattedStops = $group->groupOrders->sortBy('stop_sequence')->values()->map(function ($go) {
            $order = $go->order;
            $isPickup = $go->stop_type === 'pickup';

            return [
                'id' => $go->id,
                'stop_sequence' => $go->stop_sequence,
                'stop_type' => $go->stop_type,
                'status' => $go->status ?? ($isPickup && in_array($order?->status, ['picked_up', 'delivered']) ? 'completed' : ($order?->status === 'delivered' ? 'completed' : 'pending')),
                'completed_at' => $go->completed_at?->toIso8601String(),
                'order_id' => $go->order_id,
                'order_status' => $order?->status,
                'package_description' => $order?->package_description,
                'package_weight_kg' => (float) ($order?->package_weight_kg ?? 1.0),
                'client_name' => $order?->client?->business_name ?? $order?->client?->user?->name,
                'client_phone' => $order?->client?->user?->phone,
                'address' => $isPickup ? $order?->origin_address : $order?->dest_address,
                'lat' => (float) ($isPickup ? $order?->origin_lat : $order?->dest_lat),
                'lng' => (float) ($isPickup ? $order?->origin_lng : $order?->dest_lng),
                'isolated_distance_km' => (float) $go->isolated_distance_km,
                'shared_distance_km' => (float) $go->shared_distance_km,
                'merchant_discount' => (float) $go->merchant_discount,
                'proof_photo_url' => $order?->proof_photo_url,
            ];
        });

        $totalStops = $formattedStops->count();
        $completedStops = $formattedStops->where('status', 'completed')->count();
        $currentStop = $formattedStops->firstWhere('status', '!=', 'completed') ?? $formattedStops->last();

        return [
            'id' => $group->id,
            'courier_id' => $group->courier_id,
            'courier_name' => $group->courier?->user?->name,
            'scheduled_date' => $group->scheduled_date?->format('Y-m-d'),
            'total_distance_km' => (float) $group->total_distance_km,
            'total_duration_minutes' => $group->total_duration_minutes,
            'status' => $group->status,
            'total_combined_cost' => (float) $group->total_combined_cost,
            'total_savings_generated' => (float) $group->total_savings_generated,
            'route_fare' => $routeFare,
            'stop_fees' => $stopFees,
            'courier_bonus' => $courierBonus,
            'total_earnings' => $totalEarnings,
            'route_geometry' => $group->route_geometry,
            'total_stops' => $totalStops,
            'completed_stops_count' => $completedStops,
            'current_stop' => $currentStop,
            'is_all_completed' => $totalStops > 0 && $completedStops === $totalStops,
            'stops' => $formattedStops,
        ];
    }
}
