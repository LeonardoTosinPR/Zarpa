<?php

use App\Services\OsrmRoutingService;
use Illuminate\Support\Facades\Http;

test('calculates route with successful OSRM HTTP response', function () {
    Http::fake([
        '*/route/v1/driving/*' => Http::response([
            'code' => 'Ok',
            'routes' => [
                [
                    'distance' => 5400.0, // 5.4 km
                    'duration' => 660.0,  // 11 minutes
                    'geometry' => 'polyline_sample_string_123',
                    'legs' => [
                        [
                            'steps' => [
                                ['maneuver' => ['instruction' => 'Head north on Av Manoel Ribas']],
                            ],
                        ],
                    ],
                ],
            ],
        ], 200),
    ]);

    $service = new OsrmRoutingService();
    $result = $service->calculateRoute(-25.3954, -51.4641, -25.3494, -51.4787);

    expect($result['success'])->toBeTrue()
        ->and($result['distance_km'])->toBe(5.4)
        ->and($result['duration_minutes'])->toBe(11)
        ->and($result['polyline_geometry'])->toBe('polyline_sample_string_123')
        ->and($result['source'])->toBe('osrm')
        ->and(count($result['steps']))->toBe(1);
});

test('falls back to haversine calculation when OSRM server is unreachable', function () {
    Http::fake([
        '*/route/v1/driving/*' => Http::response(null, 500),
    ]);

    $service = new OsrmRoutingService();
    $result = $service->calculateRoute(-25.3954, -51.4641, -25.3494, -51.4787);

    expect($result['success'])->toBeTrue()
        ->and($result['source'])->toBe('fallback_haversine')
        ->and($result['distance_km'])->toBeGreaterThan(4.0)
        ->and($result['duration_minutes'])->toBeGreaterThan(5);
});
