<?php

namespace App\Http\Controllers\Api;

use App\Models\Courier;
use App\Services\CourierDispatchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Validator;

class ExpressDispatchController extends Controller
{
    protected CourierDispatchService $dispatchService;

    public function __construct(CourierDispatchService $dispatchService)
    {
        $this->dispatchService = $dispatchService;
    }

    /**
     * Retorna oportunidades expressas ativas no raio do condutor.
     * GET /api/courier/radar
     */
    public function radar(Request $request): JsonResponse
    {
        $courier = $this->resolveCourier($request);

        if (!$courier) {
            return response()->json([
                'message' => 'Perfil de condutor não encontrado para o usuário autenticado.',
            ], 403);
        }

        // Se o cliente mobile enviou coordenadas atuais no request, atualiza a posição
        if ($request->filled('lat') && $request->filled('lng')) {
            $courier->updateLocation(
                (float) $request->input('lat'),
                (float) $request->input('lng')
            );
            $courier->refresh();
        }

        $orders = $this->dispatchService->getAvailableExpressOrders($courier);

        return response()->json([
            'courier' => [
                'id' => $courier->id,
                'is_online' => (bool) $courier->is_online,
                'current_lat' => (float) $courier->current_lat,
                'current_lng' => (float) $courier->current_lng,
                'cluster_radius_km' => (float) $courier->cluster_radius_km,
            ],
            'orders_count' => $orders->count(),
            'orders' => $orders,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Aceite de corrida expressa com proteção de concorrência transacional (Pessimistic Locking).
     * POST /api/orders/{id}/accept-express
     */
    public function accept(Request $request, int $id): JsonResponse
    {
        $courier = $this->resolveCourier($request);

        if (!$courier) {
            return response()->json([
                'message' => 'Perfil de condutor não encontrado para o usuário autenticado.',
            ], 403);
        }

        $result = $this->dispatchService->acceptExpressOrder($id, $courier);

        return response()->json($result, $result['status']);
    }

    /**
     * Recusa de corrida expressa pelo condutor.
     * POST /api/orders/{id}/reject-express
     */
    public function reject(Request $request, int $id): JsonResponse
    {
        $courier = $this->resolveCourier($request);

        if (!$courier) {
            return response()->json([
                'message' => 'Perfil de condutor não encontrado para o usuário autenticado.',
            ], 403);
        }

        $reason = $request->input('reason');
        $result = $this->dispatchService->rejectExpressOrder($id, $courier, $reason);

        return response()->json($result, $result['status']);
    }

    /**
     * Atualização do status online/offline do condutor.
     * PATCH /api/courier/status
     */
    public function updateStatus(Request $request): JsonResponse
    {
        $courier = $this->resolveCourier($request);

        if (!$courier) {
            return response()->json([
                'message' => 'Perfil de condutor não encontrado.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'is_online' => ['required', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Parâmetros de status inválidos.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $courier->is_online = (bool) $request->input('is_online');
        $courier->save();

        return response()->json([
            'message' => $courier->is_online
                ? 'Condutor agora está ONLINE no radar.'
                : 'Condutor agora está OFFLINE no radar.',
            'is_online' => $courier->is_online,
        ]);
    }

    /**
     * Atualização das coordenadas geográficas atuais do condutor.
     * POST /api/courier/location
     */
    public function updateLocation(Request $request): JsonResponse
    {
        $courier = $this->resolveCourier($request);

        if (!$courier) {
            return response()->json([
                'message' => 'Perfil de condutor não encontrado.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Coordenadas geográficas inválidas.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $courier->updateLocation(
            (float) $request->input('lat'),
            (float) $request->input('lng')
        );

        return response()->json([
            'message' => 'Localização do condutor atualizada com sucesso.',
            'location' => [
                'current_lat' => (float) $courier->current_lat,
                'current_lng' => (float) $courier->current_lng,
            ],
        ]);
    }

    /**
     * Atualização dos dados de perfil e raio de atuação do condutor.
     * PATCH /api/courier/profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $courier = $this->resolveCourier($request);

        if (!$courier) {
            return response()->json([
                'message' => 'Perfil de condutor não encontrado.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'cluster_radius_km' => ['sometimes', 'numeric', 'min:1', 'max:50'],
            'vehicle_type' => ['sometimes', 'string', 'in:motorcycle,bicycle,car'],
            'vehicle_plate' => ['nullable', 'string', 'max:20'],
            'cnh' => ['nullable', 'string', 'max:20'],
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dados de perfil inválidos.',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Atualiza campos do Courier
        if ($request->has('cluster_radius_km')) {
            $courier->cluster_radius_km = (float) $request->input('cluster_radius_km');
        }
        if ($request->has('vehicle_type')) {
            $courier->vehicle_type = $request->input('vehicle_type');
        }
        if ($request->has('vehicle_plate')) {
            $courier->vehicle_plate = $request->input('vehicle_plate');
        }
        if ($request->has('cnh')) {
            $courier->cnh = $request->input('cnh');
        }
        $courier->save();

        // Atualiza campos do Usuário associado se informados
        $user = $request->user();
        $userChanged = false;
        if ($request->has('name') && !empty($request->input('name'))) {
            $user->name = $request->input('name');
            $userChanged = true;
        }
        if ($request->has('phone')) {
            $user->phone = $request->input('phone');
            $userChanged = true;
        }
        if ($userChanged) {
            $user->save();
        }

        return response()->json([
            'message' => 'Perfil do condutor atualizado com sucesso.',
            'courier' => $courier->fresh(),
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
            ],
        ]);
    }

    /**
     * Resolve o registro de Courier associado ao usuário logado ou admin master.
     */
    protected function resolveCourier(Request $request): ?Courier
    {
        $user = $request->user();

        if ($user->courier) {
            return $user->courier;
        }

        if ($user->hasFullAccess()) {
            return Courier::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'cnh' => '00000000000',
                    'vehicle_type' => 'motorcycle',
                    'vehicle_plate' => 'ADM-0000',
                    'current_lat' => -25.3954,
                    'current_lng' => -51.4641,
                    'cluster_radius_km' => 5.0,
                    'is_online' => true,
                    'is_active' => true,
                ]
            );
        }

        return null;
    }
}
