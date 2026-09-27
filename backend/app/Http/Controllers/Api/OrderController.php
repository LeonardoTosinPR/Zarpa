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

        if (!$client) {
            return response()->json([
                'message' => 'Perfil de lojista não encontrado.',
            ], 403);
        }

        $query = Order::where('client_id', $client->id)
            ->with(['courier.user'])
            ->orderBy('created_at', 'desc');

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
}
