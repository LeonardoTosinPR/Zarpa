<?php

namespace App\Http\Controllers\Api;

use App\Models\Client;
use App\Models\Courier;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    /**
     * Handle user registration (Client or Courier).
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', 'string', Rule::in(['client', 'courier', 'admin'])],
            'phone' => ['nullable', 'string', 'max:20'],

            // Client specific fields
            'business_name' => ['required_if:role,client', 'nullable', 'string', 'max:255'],
            'cnpj_cpf' => ['required_if:role,client', 'nullable', 'string', 'max:20'],
            'default_address' => ['nullable', 'string', 'max:255'],
            'default_lat' => ['nullable', 'numeric'],
            'default_lng' => ['nullable', 'numeric'],

            // Courier specific fields
            'cnh' => ['required_if:role,courier', 'nullable', 'string', 'max:20'],
            'vehicle_type' => ['required_if:role,courier', 'nullable', 'string', Rule::in(['motorcycle', 'bicycle', 'car'])],
            'vehicle_plate' => ['nullable', 'string', 'max:10'],
            'current_lat' => ['nullable', 'numeric'],
            'current_lng' => ['nullable', 'numeric'],
            'cluster_radius_km' => ['nullable', 'numeric', 'min:0.5', 'max:50'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação nos dados enviados.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        $user = DB::transaction(function () use ($validated) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => $validated['role'],
                'phone' => $validated['phone'] ?? null,
            ]);

            if ($user->role === 'client') {
                $lat = $validated['default_lat'] ?? null;
                $lng = $validated['default_lng'] ?? null;

                $client = Client::create([
                    'user_id' => $user->id,
                    'business_name' => $validated['business_name'],
                    'cnpj_cpf' => $validated['cnpj_cpf'],
                    'default_address' => $validated['default_address'] ?? null,
                    'default_lat' => $lat,
                    'default_lng' => $lng,
                ]);

                if ($lat !== null && $lng !== null) {
                    DB::statement("
                        UPDATE clients 
                        SET default_location = ST_SetSRID(ST_MakePoint(?, ?), 4326)
                        WHERE id = ?;
                    ", [$lng, $lat, $client->id]);
                }
            } elseif ($user->role === 'courier') {
                $lat = $validated['current_lat'] ?? null;
                $lng = $validated['current_lng'] ?? null;

                $courier = Courier::create([
                    'user_id' => $user->id,
                    'cnh' => $validated['cnh'],
                    'vehicle_type' => $validated['vehicle_type'] ?? 'motorcycle',
                    'vehicle_plate' => $validated['vehicle_plate'] ?? null,
                    'current_lat' => $lat,
                    'current_lng' => $lng,
                    'cluster_radius_km' => $validated['cluster_radius_km'] ?? 5.0,
                    'is_online' => false,
                    'is_active' => true,
                ]);

                if ($lat !== null && $lng !== null) {
                    DB::statement("
                        UPDATE couriers 
                        SET current_location = ST_SetSRID(ST_MakePoint(?, ?), 4326)
                        WHERE id = ?;
                    ", [$lng, $lat, $courier->id]);
                }
            }

            return $user;
        });

        $user->load(['client', 'courier']);
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Cadastro realizado com sucesso.',
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    /**
     * Handle user authentication.
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação nos dados enviados.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Credenciais inválidas. Verifique seu e-mail e senha.',
            ], 401);
        }

        $user->load(['client', 'courier']);
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Login realizado com sucesso.',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Get authenticated user profile.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['client', 'courier']);

        return response()->json([
            'user' => $user,
        ]);
    }

    /**
     * Handle user logout (revoke current token).
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout realizado com sucesso.',
        ]);
    }
}
