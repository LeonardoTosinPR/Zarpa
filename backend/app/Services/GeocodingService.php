<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class GeocodingService
{
    protected string $baseUrl;

    // Catálogo local determinístico para alta disponibilidade e testes offline em Guarapuava - PR
    // Catálogo local determinístico para alta disponibilidade e testes offline em Guarapuava - PR
    protected array $localGuarapuavaPlaces = [
        [
            'place_name' => 'UTFPR - Guarapuava',
            'display_name' => 'UTFPR - Universidade Tecnológica Federal do Paraná, Câmpus Guarapuava',
            'street' => 'Avenida Professora Laura Pacheco Bastos, 800',
            'neighborhood' => 'Industrial / Cidade dos Lagos',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3494225,
            'lng' => -51.4787116,
        ],
        [
            'place_name' => 'Shopping Cidade dos Lagos',
            'display_name' => 'Shopping Cidade dos Lagos, Guarapuava - PR',
            'street' => 'Avenida Guarapuava, 1400',
            'neighborhood' => 'Cidade dos Lagos',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3520100,
            'lng' => -51.4850200,
        ],
        [
            'place_name' => 'Unicentro - Câmpus Santa Cruz',
            'display_name' => 'Unicentro - Câmpus Santa Cruz, Guarapuava - PR',
            'street' => 'Rua Padre Salvador, 875',
            'neighborhood' => 'Santa Cruz',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3896597,
            'lng' => -51.4769122,
        ],
        [
            'place_name' => 'Unicentro - Câmpus CEDETEG',
            'display_name' => 'Unicentro - Câmpus CEDETEG, Guarapuava - PR',
            'street' => 'Alameda Élio Antonio Dalla Vecchia, 838',
            'neighborhood' => 'Vila Carli',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.4050200,
            'lng' => -51.4420300,
        ],
        [
            'place_name' => 'Centro Universitário Campo Real',
            'display_name' => 'Centro Universitário Campo Real, Guarapuava - PR',
            'street' => 'Rua Comendador Norberto, 1299',
            'neighborhood' => 'Santa Cruz',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3871200,
            'lng' => -51.4721500,
        ],
        [
            'place_name' => 'Praça 9 de Dezembro (Centro)',
            'display_name' => 'Centro, Praça 9 de Dezembro, Guarapuava - PR',
            'street' => 'Rua XV de Novembro, s/n',
            'neighborhood' => 'Centro',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3954100,
            'lng' => -51.4641200,
        ],
        [
            'place_name' => 'Terminal Rodoviário de Guarapuava',
            'display_name' => 'Terminal Rodoviário de Guarapuava - PR',
            'street' => 'Avenida Sebastião de Camargo Ribas, 2100',
            'neighborhood' => 'Bonsucesso',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3912300,
            'lng' => -51.4550100,
        ],
        [
            'place_name' => 'Parque do Lago',
            'display_name' => 'Parque do Lago, Guarapuava - PR',
            'street' => 'Rua Salvatore Renna, s/n',
            'neighborhood' => 'Batel',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.4010500,
            'lng' => -51.4670200,
        ],
        [
            'place_name' => 'Lagoa das Lágrimas',
            'display_name' => 'Lagoa das Lágrimas, Guarapuava - PR',
            'street' => 'Rua Brigadeiro Rocha, s/n',
            'neighborhood' => 'Centro',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3925000,
            'lng' => -51.4625000,
        ],
        [
            'place_name' => 'Prefeitura Municipal de Guarapuava',
            'display_name' => 'Prefeitura Municipal de Guarapuava, Centro',
            'street' => 'Rua Brigadeiro Rocha, 2777',
            'neighborhood' => 'Centro',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3948000,
            'lng' => -51.4632000,
        ],
        [
            'place_name' => 'Bairro Batel',
            'display_name' => 'Bairro Batel, Guarapuava - PR',
            'street' => 'Rua Saldanha Marinho',
            'neighborhood' => 'Batel',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3990000,
            'lng' => -51.4720000,
        ],
        [
            'place_name' => 'Bairro Santa Cruz',
            'display_name' => 'Bairro Santa Cruz, Guarapuava - PR',
            'street' => 'Rua Professora Leonídia',
            'neighborhood' => 'Santa Cruz',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3880000,
            'lng' => -51.4740000,
        ],
        [
            'place_name' => 'Bairro Bonsucesso',
            'display_name' => 'Bairro Bonsucesso, Guarapuava - PR',
            'street' => 'Avenida Manoel Ribas',
            'neighborhood' => 'Bonsucesso',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.4120000,
            'lng' => -51.4580000,
        ],
        [
            'place_name' => 'Bairro Morro Alto',
            'display_name' => 'Bairro Morro Alto, Guarapuava - PR',
            'street' => 'Avenida Moacir Julio Silvestri',
            'neighborhood' => 'Morro Alto',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3750000,
            'lng' => -51.4880000,
        ],
        [
            'place_name' => 'Bairro Trianon',
            'display_name' => 'Bairro Trianon, Guarapuava - PR',
            'street' => 'Rua Capitão Rocha',
            'neighborhood' => 'Trianon',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3910000,
            'lng' => -51.4700000,
        ],
        [
            'place_name' => 'Bairro Santana',
            'display_name' => 'Bairro Santana, Guarapuava - PR',
            'street' => 'Rua Rosa Lustosa de Siqueira',
            'neighborhood' => 'Santana',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3830000,
            'lng' => -51.4520000,
        ],
        [
            'place_name' => 'Bairro Primavera',
            'display_name' => 'Bairro Primavera, Guarapuava - PR',
            'street' => 'Rua das Camélias',
            'neighborhood' => 'Primavera',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.4200000,
            'lng' => -51.4750000,
        ],
    ];

    public function __construct()
    {
        $this->baseUrl = rtrim(env('GEOCODING_BASE_URL', 'https://nominatim.openstreetmap.org'), '/');
    }

    /**
     * Search address or landmark in Guarapuava - PR.
     * Combines Nominatim API with bounding box and local fallback catalogue.
     *
     * @param string $query
     * @return array
     */
    public function searchAddress(string $query): array
    {
        $trimmedQuery = trim($query);
        if (mb_strlen($trimmedQuery) < 2) {
            return [];
        }

        // 0. Verifica se é uma coordenada geográfica (lat, lng) para geocodificação reversa
        if (preg_match('/^([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)$/', $trimmedQuery, $coordMatches)) {
            $lat = (float) $coordMatches[1];
            $lng = (float) $coordMatches[2];

            try {
                $response = Http::withHeaders([
                    'User-Agent' => 'Zarpa-Logistics-Platform/1.0 (zarpa@zarpa.com.br)',
                ])->timeout(3)->get("{$this->baseUrl}/reverse", [
                    'lat' => $lat,
                    'lon' => $lng,
                    'format' => 'json',
                    'addressdetails' => 1,
                ]);

                if ($response->successful()) {
                    $item = $response->json();
                    if (is_array($item) && isset($item['lat'])) {
                        return [[
                            'place_name' => $item['name'] ?? null,
                            'display_name' => $item['display_name'] ?? "Localização ({$lat}, {$lng})",
                            'street' => $item['address']['road'] ?? ($item['name'] ?? ''),
                            'neighborhood' => $item['address']['suburb'] ?? ($item['address']['neighbourhood'] ?? ''),
                            'city' => 'Guarapuava',
                            'state' => 'PR',
                            'lat' => $lat,
                            'lng' => $lng,
                            'source' => 'nominatim_reverse',
                        ]];
                    }
                }
            } catch (Exception $e) {
                Log::info("Nominatim reverse geocoding failed: " . $e->getMessage());
            }

            return [[
                'place_name' => null,
                'display_name' => "Coordenadas ({$lat}, {$lng})",
                'street' => "Ponto no mapa ({$lat}, {$lng})",
                'neighborhood' => '',
                'city' => 'Guarapuava',
                'state' => 'PR',
                'lat' => $lat,
                'lng' => $lng,
                'source' => 'coordinates',
            ]];
        }

        $normalizedInput = $this->normalizeText($trimmedQuery);
        $isPoiKeyword = str_contains($normalizedInput, 'utfpr')
            || str_contains($normalizedInput, 'unicentro')
            || str_contains($normalizedInput, 'cedeteg')
            || str_contains($normalizedInput, 'campo real')
            || str_contains($normalizedInput, 'cidade dos lagos');

        // Se for um polo de ensino ou estabelecimento específico de Guarapuava, prioriza o catálogo local
        if ($isPoiKeyword) {
            $localMatches = $this->searchLocalDictionary($trimmedQuery);
            if (!empty($localMatches)) {
                return $localMatches;
            }
        }

        // 2. Consulta ao Nominatim com delimitação geográfica de Guarapuava
        try {
            $response = Http::withHeaders([
                'User-Agent' => 'Zarpa-Logistics-Platform/1.0 (zarpa@zarpa.com.br)',
            ])->timeout(3)->get("{$this->baseUrl}/search", [
                'q' => "{$trimmedQuery}, Guarapuava, PR, Brasil",
                'format' => 'json',
                'addressdetails' => 1,
                'limit' => 5,
                // Bounding box de Guarapuava - PR: lon_min, lat_max, lon_max, lat_min
                'viewbox' => '-51.58,-25.30,-51.35,-25.48',
                'bounded' => 1,
            ]);

            if ($response->successful()) {
                $results = $response->json();
                if (is_array($results) && count($results) > 0) {
                    return array_map(function ($item) {
                        $placeName = $item['name'] ?? ($item['address']['amenity'] ?? ($item['address']['building'] ?? null));
                        return [
                            'place_name' => $placeName,
                            'display_name' => $item['display_name'] ?? '',
                            'street' => $item['address']['road'] ?? ($item['name'] ?? ''),
                            'neighborhood' => $item['address']['suburb'] ?? ($item['address']['neighbourhood'] ?? ''),
                            'city' => 'Guarapuava',
                            'state' => 'PR',
                            'lat' => (float) ($item['lat'] ?? 0),
                            'lng' => (float) ($item['lon'] ?? 0),
                            'source' => 'nominatim',
                        ];
                    }, $results);
                }
            }
        } catch (Exception $e) {
            Log::info("Nominatim search skipped or failed, using local dictionary: " . $e->getMessage());
        }

        return $this->searchLocalDictionary($trimmedQuery);
    }

    /**
     * Substring matching in local deterministic database of Guarapuava.
     */
    public function searchLocalDictionary(string $query): array
    {
        $normalizedQuery = $this->normalizeText($query);
        $matches = [];

        foreach ($this->localGuarapuavaPlaces as $place) {
            $searchTarget = $this->normalizeText(
                ($place['place_name'] ?? '') . ' ' . $place['display_name'] . ' ' . $place['street'] . ' ' . $place['neighborhood']
            );

            // Confere se as palavras da busca estão contidas no ponto de referência
            $words = explode(' ', $normalizedQuery);
            $allWordsMatch = true;

            foreach ($words as $word) {
                if (mb_strlen($word) > 1 && !str_contains($searchTarget, $word)) {
                    $allWordsMatch = false;
                    break;
                }
            }

            if ($allWordsMatch || str_contains($searchTarget, $normalizedQuery)) {
                $item = $place;
                $item['source'] = 'local_catalog';
                $matches[] = $item;
            }
        }

        return array_slice($matches, 0, 5);
    }

    /**
     * Remove acentos e converte para minúsculas para comparação flexível.
     */
    protected function normalizeText(string $text): string
    {
        $text = mb_strtolower($text, 'UTF-8');
        $text = preg_replace('/[áàâãä]/u', 'a', $text);
        $text = preg_replace('/[éèêë]/u', 'e', $text);
        $text = preg_replace('/[íìîï]/u', 'i', $text);
        $text = preg_replace('/[óòôõö]/u', 'o', $text);
        $text = preg_replace('/[úùûü]/u', 'u', $text);
        $text = preg_replace('/[ç]/u', 'c', $text);
        return trim(preg_replace('/\s+/', ' ', $text));
    }
}
