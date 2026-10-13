<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\User;
use App\Models\Courier;
use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class AdminController extends Controller
{
    /**
     * Retorna a lista completa de usuários do sistema com filtros e métricas.
     */
    public function users(Request $request): JsonResponse
    {
        $roleFilter = $request->query('role');
        $search = $request->query('search');

        $query = User::with(['client', 'courier'])->latest();

        if ($roleFilter && in_array($roleFilter, ['client', 'courier', 'admin'])) {
            $query->where('role', $roleFilter);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhere('phone', 'ilike', "%{$search}%");
            });
        }

        $users = $query->get();

        $metrics = [
            'total' => User::count(),
            'clients' => User::where('role', 'client')->count(),
            'couriers' => User::where('role', 'courier')->count(),
            'admins' => User::where('role', 'admin')->count(),
            'online_couriers' => Courier::where('is_online', true)->count(),
        ];

        return response()->json([
            'users' => $users,
            'metrics' => $metrics,
        ]);
    }

    /**
     * Retorna a lista completa de todos os pedidos existentes no app com filtros e métricas.
     */
    public function orders(Request $request): JsonResponse
    {
        $statusFilter = $request->query('status');
        $typeFilter = $request->query('shipping_type');
        $search = $request->query('search');

        $query = Order::with(['client.user', 'courier.user', 'deliveryGroups'])->latest();

        if ($statusFilter) {
            $query->where('status', $statusFilter);
        }

        if ($typeFilter && in_array($typeFilter, ['express', 'economic'])) {
            $query->where('shipping_type', $typeFilter);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('package_description', 'ilike', "%{$search}%")
                  ->orWhere('origin_address', 'ilike', "%{$search}%")
                  ->orWhere('dest_address', 'ilike', "%{$search}%");

                if (is_numeric($search)) {
                    $q->orWhere('id', (int) $search);
                }
            });
        }

        $orders = $query->get();

        $metrics = [
            'total' => Order::count(),
            'express' => Order::where('shipping_type', 'express')->count(),
            'economic' => Order::where('shipping_type', 'economic')->count(),
            'pending' => Order::where('status', 'pending')->count(),
            'in_progress' => Order::whereIn('status', ['assigned', 'picked_up'])->count(),
            'delivered' => Order::where('status', 'delivered')->count(),
            'canceled' => Order::where('status', 'canceled')->count(),
            'total_freight_value' => (float) Order::sum('individual_freight_price'),
        ];

        return response()->json([
            'orders' => $orders,
            'metrics' => $metrics,
        ]);
    }

    /**
     * Alterna o status (ativo/inativo) de um entregador.
     */
    public function toggleCourierStatus(int $id, Request $request): JsonResponse
    {
        $courier = Courier::findOrFail($id);
        
        $validated = $request->validate([
            'is_active' => 'required|boolean',
        ]);

        $courier->update([
            'is_active' => $validated['is_active'],
            'is_online' => $validated['is_active'] ? $courier->is_online : false, // se inativar, derruba
        ]);

        return response()->json([
            'message' => 'Status do entregador atualizado.',
            'courier' => $courier,
        ]);
    }
}
