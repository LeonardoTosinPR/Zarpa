<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class GeocodingService
{
    protected string $baseUrl;

    // Catálogo local determinístico para alta disponibilidade e testes offline em Guarapuava - PR
    protected array $localGuarapuavaPlaces = [
        [
            'display_name' => 'UTFPR - Universidade Tecnológica Federal do Paraná, Câmpus Guarapuava',
            'street' => 'Avenida Professora Laura Pacheco Bastos, 800',
            'neighborhood' => 'Industrial / Cidade dos Lagos',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3494225,
            'lng' => -51.4787116,
        ],
        [
            'display_name' => 'Shopping Cidade dos Lagos, Guarapuava - PR',
            'street' => 'Avenida Guarapuava, 1400',
            'neighborhood' => 'Cidade dos Lagos',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3520100,
            'lng' => -51.4850200,
        ],
        [
            'display_name' => 'Unicentro - Câmpus Santa Cruz, Guarapuava - PR',
            'street' => 'Rua Padre Salvador, 875',
            'neighborhood' => 'Santa Cruz',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3896597,
            'lng' => -51.4769122,
        ],
        [
            'display_name' => 'Unicentro - Câmpus CEDETEG, Guarapuava - PR',
            'street' => 'Alameda Élio Antonio Dalla Vecchia, 838',
            'neighborhood' => 'Vila Carli',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.4050200,
            'lng' => -51.4420300,
        ],
        [
            'display_name' => 'Centro, Praça 9 de Dezembro, Guarapuava - PR',
            'street' => 'Rua XV de Novembro, s/n',
            'neighborhood' => 'Centro',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3954100,
            'lng' => -51.4641200,
        ],
        [
            'display_name' => 'Terminal Rodoviário de Guarapuava - PR',
            'street' => 'Avenida Sebastião de Camargo Ribas, 2100',
            'neighborhood' => 'Bonsucesso',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3912300,
            'lng' => -51.4550100,
        ],
        [
            'display_name' => 'Parque do Lago, Guarapuava - PR',
            'street' => 'Rua Salvatore Renna, s/n',
            'neighborhood' => 'Batel',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.4010500,
            'lng' => -51.4670200,
        ],
        [
            'display_name' => 'Lagoa das Lágrimas, Guarapuava - PR',
            'street' => 'Rua Brigadeiro Rocha, s/n',
            'neighborhood' => 'Centro',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3925000,
            'lng' => -51.4625000,
        ],
        [
            'display_name' => 'Bairro Batel, Guarapuava - PR',
            'street' => 'Rua Saldanha Marinho',
            'neighborhood' => 'Batel',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3990000,
            'lng' => -51.4720000,
        ],
        [
            'display_name' => 'Bairro Santa Cruz, Guarapuava - PR',
            'street' => 'Rua Professora Leonídia',
            'neighborhood' => 'Santa Cruz',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3880000,
            'lng' => -51.4740000,
        ],
        [
            'display_name' => 'Bairro Bonsucesso, Guarapuava - PR',
            'street' => 'Avenida Manoel Ribas',
            'neighborhood' => 'Bonsucesso',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.4120000,
            'lng' => -51.4580000,
        ],
        [
            'display_name' => 'Bairro Morro Alto, Guarapuava - PR',
            'street' => 'Avenida Moacir Julio Silvestri',
            'neighborhood' => 'Morro Alto',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3750000,
            'lng' => -51.4880000,
        ],
        [
            'display_name' => 'Bairro Trianon, Guarapuava - PR',
            'street' => 'Rua Capitão Rocha',
            'neighborhood' => 'Trianon',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3910000,
            'lng' => -51.4700000,
        ],
        [
            'display_name' => 'Bairro Santana, Guarapuava - PR',
            'street' => 'Rua Rosa Lustosa de Siqueira',
            'neighborhood' => 'Santana',
            'city' => 'Guarapuava',
            'state' => 'PR',
            'lat' => -25.3830000,
            'lng' => -51.4520000,
        ],
        [
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

        // 1. Tenta consulta ao Nominatim com delimitação geográfica de Guarapuava
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
                        return [
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

        // 2. Busca local de alta disponibilidade no dicionário de Guarapuava
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
                $place['display_name'] . ' ' . $place['street'] . ' ' . $place['neighborhood']
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

        // Se nenhuma palavra coincidiu exatamente, mas a query possui tamanho razoável,
        // retorna os pontos mais centrais de Guarapuava como sugestão de apoio
        if (empty($matches)) {
            return array_slice(array_map(function ($p) {
                $p['source'] = 'local_catalog';
                return $p;
            }, $this->localGuarapuavaPlaces), 0, 4);
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
