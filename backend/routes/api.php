<?php

use App\Http\Controllers\Api\AuthController;
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

    // Client protected zone
    Route::middleware('role.client')->prefix('client')->group(function () {
        Route::get('/profile', function (Request $request) {
            return response()->json([
                'message' => 'Perfil do Lojista acessado com sucesso.',
                'client' => $request->user()->client,
            ]);
        });
    });

    // Courier protected zone
    Route::middleware('role.courier')->prefix('courier')->group(function () {
        Route::get('/profile', function (Request $request) {
            return response()->json([
                'message' => 'Perfil do Entregador acessado com sucesso.',
                'courier' => $request->user()->courier,
            ]);
        });
    });
});
