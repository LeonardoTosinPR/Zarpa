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

test('accurately interpolates coordinates for long thoroughfares with street number', function () {
    $service = new GeocodingService();
    
    // Teste com número baixo (nº 40) no início da Saldanha Marinho (Batel / Dos Estados)
    $lowNumberResults = $service->searchAddress('Rua Saldanha Marinho, 40');
    expect($lowNumberResults)->not->toBeEmpty()
        ->and($lowNumberResults[0]['source'])->toBe('thoroughfare_interpolation')
        ->and($lowNumberResults[0]['lat'])->toBeGreaterThan(-25.405)
        ->and($lowNumberResults[0]['lat'])->toBeLessThan(-25.403)
        ->and($lowNumberResults[0]['lng'])->toBeGreaterThan(-51.460)
        ->and($lowNumberResults[0]['lng'])->toBeLessThan(-51.458);

    // Teste com número alto (nº 2800) no final da Saldanha Marinho (São Cristóvão)
    $highNumberResults = $service->searchAddress('Rua Saldanha Marinho 2800');
    expect($highNumberResults)->not->toBeEmpty()
        ->and($highNumberResults[0]['source'])->toBe('thoroughfare_interpolation')
        ->and($highNumberResults[0]['lat'])->toBeLessThan(-25.380)
        ->and($highNumberResults[0]['lng'])->toBeLessThan(-51.480);
});

