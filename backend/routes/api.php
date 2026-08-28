<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

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

