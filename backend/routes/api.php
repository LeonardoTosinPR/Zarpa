<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ExpressDispatchController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

// 1. Healthcheck Endpoint
Route::get('/health', function () {
    $dbConnected = false;
    $postgisEnabled = false;
    $dbError = null;

    try {
        DB::connection()->getPdo();
        $dbConnected = true;

        $postgisCheck = DB::select("SELECT 1 FROM pg_extension WHERE extname = 'postgis'");
        $postgisEnabled = !empty($postgisCheck);
    } catch (\Throwable $e) {
        $dbError = $e->getMessage();
    }

    $status = $dbConnected ? 'ok' : 'degraded';

    return response()->json([
        'status' => $status,
        'service' => 'zarpa-backend-api',
        'timestamp' => now()->toIso8601String(),
        'database' => [
            'connected' => $dbConnected,
            'postgis_enabled' => $postgisEnabled,
            'error' => $dbError,
        ],
    ], $dbConnected ? 200 : 503);
});

// 2. Public Authentication Routes
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

// 3. Protected Routes (Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    // Rotas de Pedidos e Roteamento (Sprint 2)
    Route::prefix('orders')->group(function () {
        Route::get('/geocode', [OrderController::class, 'geocode']);
        Route::post('/estimate', [OrderController::class, 'estimate']);
    });

    // Client protected zone
    Route::middleware('role.client')->prefix('client')->group(function () {
        Route::get('/profile', function (Request $request) {
            return response()->json([
                'message' => 'Perfil do Lojista acessado com sucesso.',
                'client' => $request->user()->client,
            ]);
        });
    });

    // Postagem e Gestão de Pedidos do Lojista
    Route::middleware('role.client')->prefix('orders')->group(function () {
        Route::post('/', [OrderController::class, 'store']);
        Route::get('/my-orders', [OrderController::class, 'myOrders']);
    });

    // Detalhes do Pedido (acessível por Lojista dono, Entregador atribuído ou Admin)
    Route::get('/orders/{id}', [OrderController::class, 'show']);

    // Courier protected zone (Sprint 3: Radar Expresso e Concorrência)
    Route::middleware('role.courier')->group(function () {
        Route::prefix('courier')->group(function () {
            Route::get('/profile', function (Request $request) {
                return response()->json([
                    'message' => 'Perfil do Entregador acessado com sucesso.',
                    'courier' => $request->user()->courier,
                    'user' => [
                        'id' => $request->user()->id,
                        'name' => $request->user()->name,
                        'email' => $request->user()->email,
                        'phone' => $request->user()->phone,
                        'role' => $request->user()->role,
                    ],
                ]);
            });
            Route::patch('/profile', [ExpressDispatchController::class, 'updateProfile']);
            Route::get('/radar', [ExpressDispatchController::class, 'radar']);
            Route::patch('/status', [ExpressDispatchController::class, 'updateStatus']);
            Route::post('/location', [ExpressDispatchController::class, 'updateLocation']);
        });

        // Ciclo de vida da entrega expressa sob demanda
        Route::post('/orders/{id}/accept-express', [ExpressDispatchController::class, 'accept']);
        Route::post('/orders/{id}/reject-express', [ExpressDispatchController::class, 'reject']);
        Route::post('/orders/{id}/pickup', [ExpressDispatchController::class, 'pickup']);
        Route::post('/orders/{id}/deliver', [ExpressDispatchController::class, 'deliver']);
        Route::post('/orders/{id}/cancel-delivery', [ExpressDispatchController::class, 'cancelDelivery']);
    });
});
