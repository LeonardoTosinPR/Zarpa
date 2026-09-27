<?php

use App\Services\GeocodingService;
use Illuminate\Support\Facades\Http;

test('resolves address using Nominatim API when available', function () {
    Http::fake([
        '*/search*' => Http::response([
            [
                'display_name' => 'Avenida Manoel Ribas, Centro, Guarapuava, PR, Brasil',
                'lat' => '-25.3940',
                'lon' => '-51.4660',
                'address' => [
                    'road' => 'Avenida Manoel Ribas',
                    'suburb' => 'Centro',
                ],
            ],
        ], 200),
    ]);

    $service = new GeocodingService();
    $results = $service->searchAddress('Manoel Ribas');

    expect($results)->toHaveCount(1)
        ->and($results[0]['street'])->toBe('Avenida Manoel Ribas')
        ->and($results[0]['neighborhood'])->toBe('Centro')
        ->and($results[0]['lat'])->toBe(-25.394)
        ->and($results[0]['lng'])->toBe(-51.466)
        ->and($results[0]['source'])->toBe('nominatim');
});

test('uses local Guarapuava dictionary fallback when Nominatim fails', function () {
    Http::fake([
        '*/search*' => Http::response(null, 503),
    ]);

    $service = new GeocodingService();
    $results = $service->searchAddress('UTFPR');

    expect($results)->not->toBeEmpty()
        ->and($results[0]['source'])->toBe('local_catalog')
        ->and($results[0]['display_name'])->toContain('UTFPR')
        ->and($results[0]['city'])->toBe('Guarapuava');
});
