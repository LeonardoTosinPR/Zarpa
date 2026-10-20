<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\Client;
use App\Services\OsrmRoutingService;
use App\Services\GeocodingService;
use App\Services\FreightCalculatorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    protected OsrmRoutingService $routingService;
    protected GeocodingService $geocodingService;
    protected FreightCalculatorService $freightCalculator;

    public function __construct(
        OsrmRoutingService $routingService,
        GeocodingService $geocodingService,
        FreightCalculatorService $freightCalculator
    ) {
        $this->routingService = $routingService;
        $this->geocodingService = $geocodingService;
        $this->freightCalculator = $freightCalculator;
    }

    /**
     * Autocomplete de endereços para Guarapuava - PR.
     * GET /api/orders/geocode?q=...
     */
    public function geocode(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'q' => ['required', 'string', 'min:2'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Termo de busca inválido.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $results = $this->geocodingService->searchAddress($request->query('q'));

        return response()->json([
            'query' => $request->query('q'),
            'results' => $results,
        ]);
    }

    /**
     * Simulação de rota viária e estimativa de frete.
     * POST /api/orders/estimate
     */
    public function estimate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'origin_lat' => ['required', 'numeric'],
            'origin_lng' => ['required', 'numeric'],
            'dest_lat' => ['required', 'numeric'],
            'dest_lng' => ['required', 'numeric'],
            'package_weight_kg' => ['nullable', 'numeric', 'min:0.1'],
            'shipping_type' => ['nullable', 'string', Rule::in(['express', 'economic'])],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Parâmetros de cotação inválidos.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $weight = (float) ($validated['package_weight_kg'] ?? 1.0);
        $shippingType = $validated['shipping_type'] ?? 'economic';

        $route = $this->routingService->calculateRoute(
            (float) $validated['origin_lat'],
            (float) $validated['origin_lng'],
            (float) $validated['dest_lat'],
            (float) $validated['dest_lng']
        );

        $pricing = $this->freightCalculator->calculate(
            $route['distance_km'],
            $weight,
            $shippingType
        );

        return response()->json([
            'route' => $route,
            'pricing' => $pricing,
        ]);
    }

    /**
     * Criação de novo pedido de entrega pelo lojista.
     * POST /api/orders
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $client = $user->client;

        // Se usuário for admin sem perfil client registrado, cria ou usa de teste
        if (!$client && $user->hasFullAccess()) {
            $client = Client::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'business_name' => 'Comércio Admin Zarpa',
                    'cnpj_cpf' => '00.000.000/0001-00',
                    'default_address' => 'Centro, Guarapuava - PR',
                    'default_lat' => -25.3954,
                    'default_lng' => -51.4641,
                ]
            );
        }

        if (!$client) {
            return response()->json([
                'message' => 'Perfil de lojista não encontrado para o usuário autenticado.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'package_description' => ['required', 'string', 'max:255'],
            'package_weight_kg' => ['required', 'numeric', 'min:0.1', 'max:100'],
            'package_volume_m3' => ['nullable', 'numeric', 'min:0.0001'],
            'shipping_type' => ['required', 'string', Rule::in(['express', 'economic'])],
            'origin_address' => ['required', 'string', 'max:255'],
            'dest_address' => ['required', 'string', 'max:255'],
            'origin_lat' => ['required', 'numeric'],
            'origin_lng' => ['required', 'numeric'],
            'dest_lat' => ['required', 'numeric'],
            'dest_lng' => ['required', 'numeric'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação no formulário de pedido.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        // 1. Calcula o trajeto viário via OSRM
        $route = $this->routingService->calculateRoute(
            (float) $validated['origin_lat'],
            (float) $validated['origin_lng'],
            (float) $validated['dest_lat'],
            (float) $validated['dest_lng']
        );

        // 2. Calcula a precificação oficial
        $pricing = $this->freightCalculator->calculate(
            $route['distance_km'],
            (float) $validated['package_weight_kg'],
            $validated['shipping_type']
        );

        // 3. Persiste o pedido com coordenadas numéricas e PostGIS
        $order = Order::create([
            'client_id' => $client->id,
            'package_description' => $validated['package_description'],
            'package_weight_kg' => $validated['package_weight_kg'],
            'package_volume_m3' => $validated['package_volume_m3'] ?? null,
            'shipping_type' => $validated['shipping_type'],
            'status' => 'pending',
            'is_anchor' => false,
            'individual_freight_price' => $pricing['individual_price'],
            'final_freight_price' => null,
            'distance_km' => $route['distance_km'],
            'estimated_duration_minutes' => $route['duration_minutes'],
            'route_geometry' => $route['polyline_geometry'],
            'origin_address' => $validated['origin_address'],
            'dest_address' => $validated['dest_address'],
            'origin_lat' => $validated['origin_lat'],
            'origin_lng' => $validated['origin_lng'],
            'dest_lat' => $validated['dest_lat'],
            'dest_lng' => $validated['dest_lng'],
        ]);

        return response()->json([
            'message' => 'Pedido de entrega criado com sucesso!',
            'order' => $order,
            'pricing_details' => $pricing,
        ], 201);
    }

    /**
     * Listagem dos pedidos do lojista autenticado.
     * GET /api/orders/my-orders
     */
    public function myOrders(Request $request): JsonResponse
    {
        $user = $request->user();
        $client = $user->client;

        if (!$client && $user->hasFullAccess()) {
            $client = Client::where('user_id', $user->id)->first();
        }

        // Se for admin e não tiver client vinculado, visualiza todos os pedidos
        if (!$client && $user->hasFullAccess()) {
            $query = Order::with(['courier.user', 'client.user'])
                ->orderBy('created_at', 'desc');
        } else {
            if (!$client) {
                return response()->json([
                    'message' => 'Perfil de lojista não encontrado.',
                ], 403);
            }

            $query = Order::where('client_id', $client->id)
                ->with(['courier.user'])
                ->orderBy('created_at', 'desc');
        }

        if ($request->has('status') && !empty($request->query('status'))) {
            $query->where('status', $request->query('status'));
        }

        $orders = $query->paginate(20);

        return response()->json($orders);
    }

    /**
     * Detalhes de um pedido específico.
     * GET /api/orders/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $order = Order::with(['client.user', 'courier.user'])->find($id);

        if (!$order) {
            return response()->json([
                'message' => 'Pedido não encontrado.',
            ], 404);
        }

        // Validação de acesso: apenas o próprio lojista, o entregador atribuído ou admin podem ver
        $isOwnerClient = $user->client && $user->client->id === $order->client_id;
        $isAssignedCourier = $user->courier && $user->courier->id === $order->courier_id;
        $isAdmin = $user->hasFullAccess();

        if (!$isOwnerClient && !$isAssignedCourier && !$isAdmin) {
            return response()->json([
                'message' => 'Acesso não autorizado para visualizar este pedido.',
            ], 403);
        }

        return response()->json([
            'order' => $order,
        ]);
    }

    /**
     * Rastreamento com linha do tempo de eventos do pedido.
     * GET /api/orders/{id}/tracking
     */
    public function tracking(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $order = Order::with(['client.user', 'courier.user', 'groupOrders.deliveryGroup'])->find($id);

        if (!$order) {
            return response()->json(['message' => 'Pedido não encontrado.'], 404);
        }

        $isOwnerClient = $user->client && $user->client->id === $order->client_id;
        $isAssignedCourier = $user->courier && $user->courier->id === $order->courier_id;
        $isAdmin = $user->hasFullAccess();

        if (!$isOwnerClient && !$isAssignedCourier && !$isAdmin) {
            return response()->json(['message' => 'Acesso não autorizado para rastrear este pedido.'], 403);
        }

        $timeline = [
            [
                'step' => 'created',
                'title' => 'Pedido Criado',
                'description' => 'Solicitação registrada na plataforma.',
                'timestamp' => $order->created_at?->toIso8601String(),
                'completed' => true,
            ],
            [
                'step' => 'assigned',
                'title' => 'Condutor Atribuído',
                'description' => $order->courier
                    ? "Atribuído ao condutor {$order->courier->user?->name}."
                    : 'Aguardando condutor disponível ou fechamento do lote econômico.',
                'timestamp' => $order->assigned_at?->toIso8601String() ?? ($order->status !== 'pending' ? $order->updated_at?->toIso8601String() : null),
                'completed' => in_array($order->status, ['assigned', 'picked_up', 'delivered']),
            ],
            [
                'step' => 'picked_up',
                'title' => 'Mercadoria Coletada',
                'description' => 'Pacote em trânsito com o condutor a caminho do destino.',
                'timestamp' => $order->picked_up_at?->toIso8601String(),
                'completed' => in_array($order->status, ['picked_up', 'delivered']),
            ],
            [
                'step' => 'delivered',
                'title' => 'Entrega Concluída',
                'description' => 'Mercadoria entregue com sucesso.',
                'timestamp' => $order->delivered_at?->toIso8601String(),
                'completed' => $order->status === 'delivered',
            ],
        ];

        return response()->json([
            'order_id' => $order->id,
            'status' => $order->status,
            'shipping_type' => $order->shipping_type,
            'package_description' => $order->package_description,
            'package_weight_kg' => (float) $order->package_weight_kg,
            'origin_address' => $order->origin_address,
            'dest_address' => $order->dest_address,
            'courier' => $order->courier ? [
                'id' => $order->courier->id,
                'name' => $order->courier->user?->name,
                'phone' => $order->courier->user?->phone,
                'vehicle_type' => $order->courier->vehicle_type,
                'vehicle_plate' => $order->courier->vehicle_plate,
            ] : null,
            'proof_photo_url' => $order->proof_photo_url,
            'timeline' => $timeline,
        ]);
    }

    /**
     * Atualização manual de status do ciclo de vida com validações estritas.
     * PATCH /api/orders/{id}/status
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $courier = $user->courier;

        $order = Order::find($id);
        if (!$order) {
            return response()->json(['message' => 'Pedido não encontrado.'], 404);
        }

        if (!$user->hasFullAccess() && (!$courier || $order->courier_id !== $courier->id)) {
            return response()->json(['message' => 'Acesso negado: você não tem permissão para atualizar este pedido.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'status' => ['required', 'string', Rule::in(['picked_up', 'delivered', 'canceled'])],
            'proof_photo_url' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Parâmetros de status inválidos.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $targetStatus = $request->input('status');

        if ($targetStatus === 'picked_up') {
            if ($order->status !== 'assigned') {
                return response()->json([
                    'message' => "Transição inválida: o pedido deve estar no status 'assigned' para ser coletado. Status atual: {$order->status}.",
                ], 422);
            }

            $order->update([
                'status' => 'picked_up',
                'picked_up_at' => now(),
            ]);

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
        } elseif ($targetStatus === 'delivered') {
            if ($order->status !== 'picked_up') {
                return response()->json([
                    'message' => "Transição inválida: o pedido deve ser marcado como 'picked_up' antes de ser finalizado. Status atual: {$order->status}.",
                ], 422);
            }

            $proof = $request->input('proof_photo_url') ?? $order->proof_photo_url;
            $order->update([
                'status' => 'delivered',
                'delivered_at' => now(),
                'proof_photo_url' => $proof,
            ]);

            \App\Models\GroupOrder::where('order_id', $order->id)
                ->where('stop_type', 'delivery')
                ->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                ]);

            $group = $order->currentDeliveryGroup();
            if ($group) {
                $pending = \App\Models\GroupOrder::where('delivery_group_id', $group->id)
                    ->where('status', '!=', 'completed')
                    ->count();
                if ($pending === 0) {
                    $group->update(['status' => 'completed']);
                }
            }
        } elseif ($targetStatus === 'canceled') {
            $order->update(['status' => 'canceled']);
        }

        return response()->json([
            'success' => true,
            'message' => "Status atualizado com sucesso para '{$order->status}'.",
            'order' => $order->fresh(['client.user', 'courier.user']),
        ]);
    }

    /**
     * Upload de foto como comprovante de entrega.
     * POST /api/orders/{id}/proof
     */
    public function uploadProof(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $courier = $user->courier;

        $order = Order::find($id);
        if (!$order) {
            return response()->json(['message' => 'Pedido não encontrado.'], 404);
        }

        if (!$user->hasFullAccess() && (!$courier || $order->courier_id !== $courier->id)) {
            return response()->json(['message' => 'Acesso negado: você não tem permissão para anexar comprovante a este pedido.'], 403);
        }

        $photoUrl = null;

        if ($request->hasFile('photo')) {
            $validator = Validator::make($request->all(), [
                'photo' => ['image', 'max:10240'],
            ]);
            if ($validator->fails()) {
                return response()->json(['message' => 'Arquivo inválido.', 'errors' => $validator->errors()], 422);
            }
            $path = $request->file('photo')->store('proofs', 'public');
            $photoUrl = '/storage/' . $path;
        } elseif ($request->filled('photo_base64')) {
            $base64 = $request->input('photo_base64');
            $type = 'jpg';
            if (preg_match('/^data:image\/(\w+);base64,/', $base64, $matches)) {
                $base64 = substr($base64, strpos($base64, ',') + 1);
                $type = strtolower($matches[1]);
            }
            $data = base64_decode($base64);
            $fileName = 'proofs/proof_' . $order->id . '_' . time() . '.' . $type;
            \Illuminate\Support\Facades\Storage::disk('public')->put($fileName, $data);
            $photoUrl = '/storage/' . $fileName;
        } elseif ($request->filled('proof_url')) {
            $photoUrl = $request->input('proof_url');
        } else {
            return response()->json(['message' => 'Nenhuma imagem ou URL de comprovante fornecida.'], 422);
        }

        $order->update([
            'proof_photo_url' => $photoUrl,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Comprovante anexado com sucesso!',
            'proof_photo_url' => $photoUrl,
            'order' => $order->fresh(),
        ]);
    }
}
