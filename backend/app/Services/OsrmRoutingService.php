<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class OsrmRoutingService
{
    protected string $baseUrl;
    protected ?string $username;
    protected ?string $password;

    public function __construct()
    {
        $this->baseUrl = rtrim(env('OSRM_BASE_URL', 'https://osrmcar.debug.app.br'), '/');
        $this->username = env('OSRM_USERNAME');
        $this->password = env('OSRM_PASSWORD');
    }

    /**
     * Calculate driving route between origin and destination using OSRM.
     * Normalizes coordinates to OSRM format: {lng1},{lat1};{lng2},{lat2}
     *
     * @param float $originLat Latitude da Origem
     * @param float $originLng Longitude da Origem
     * @param float $destLat Latitude do Destino
     * @param float $destLng Longitude do Destino
     * @return array
     */
    public function calculateRoute(float $originLat, float $originLng, float $destLat, float $destLng): array
    {
        // Padrão OSRM: longitude,latitude;longitude,latitude
        $coordinates = "{$originLng},{$originLat};{$destLng},{$destLat}";
        $url = "{$this->baseUrl}/route/v1/driving/{$coordinates}";

        try {
            $request = Http::timeout(5)->acceptJson();

            if (!empty($this->username) && !empty($this->password)) {
                $request = $request->withBasicAuth($this->username, $this->password);
            }

            $response = $request->get($url, [
                'steps' => 'true',
                'overview' => 'full',
                'geometries' => 'polyline',
            ]);

            if ($response->successful()) {
                $data = $response->json();
                if (!empty($data['routes'][0])) {
                    $route = $data['routes'][0];
                    $distanceMeters = (float) ($route['distance'] ?? 0);
                    $durationSeconds = (float) ($route['duration'] ?? 0);

                    return [
                        'success' => true,
                        'distance_km' => round($distanceMeters / 1000, 2),
                        'duration_minutes' => (int) ceil($durationSeconds / 60),
                        'polyline_geometry' => $route['geometry'] ?? null,
                        'steps' => $route['legs'][0]['steps'] ?? [],
                        'source' => 'osrm',
                    ];
                }
            }

            Log::warning("OSRM returned non-successful status ({$response->status()}): " . $response->body());
        } catch (Exception $e) {
            Log::error("OSRM Routing error: " . $e->getMessage());
        }

        // Fallback: cálculo de distância geodésica com coeficiente viário
        return $this->fallbackHaversineRoute($originLat, $originLng, $destLat, $destLng);
    }

    /**
     * Fallback de alta disponibilidade com fórmula de Haversine e fator viário.
     */
    protected function fallbackHaversineRoute(float $lat1, float $lon1, float $lat2, float $lon2): array
    {
        $earthRadiusKm = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        $straightDistance = $earthRadiusKm * $c;

        // Fator de sinuosidade viária urbana média (1.30x)
        $urbanDistanceKm = round($straightDistance * 1.30, 2);
        // Estimativa média de 30 km/h em perímetro urbano
        $durationMinutes = (int) ceil(($urbanDistanceKm / 30) * 60);

        return [
            'success' => true,
            'distance_km' => max(0.5, $urbanDistanceKm),
            'duration_minutes' => max(3, $durationMinutes),
            'polyline_geometry' => null,
            'steps' => [],
            'source' => 'fallback_haversine',
        ];
    }
}
