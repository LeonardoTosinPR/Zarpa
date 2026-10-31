<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Courier;
use App\Models\Order;
use App\Models\User;
use App\Services\FreightCalculatorService;
use App\Services\OsrmRoutingService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class FinalValidationSeeder extends Seeder
{
    /**
     * Seeder de Homologação Final da Sprint 7 - Cenários Reais de Guarapuava (PR).
     * Popula estabelecimentos comerciais, entregadores em múltiplos quadrantes,
     * pedidos expressos para radar/disputa e pedidos econômicos para clusterização e rateio 50/50.
     */
    public function run(): void
    {
        $routingService = app(OsrmRoutingService::class);
        $freightCalculator = app(FreightCalculatorService::class);

        // ==============================================================
        // 1. POLOS COMERCIAIS / LOJISTAS REAIS DE GUARAPUAVA
        // ==============================================================
        $merchants = [
            [
                'email' => 'mcdonalds@zarpa.com.br',
                'name' => 'Gerência McDonald\'s Centro',
                'business_name' => 'McDonald\'s Guarapuava Centro',
                'cnpj_cpf' => '42.111.222/0001-10',
                'address' => 'Rua Vicente Machado, 1400 - Centro, Guarapuava - PR',
                'lat' => -25.39420000,
                'lng' => -51.46350000,
            ],
            [
                'email' => 'chiquinho@zarpa.com.br',
                'name' => 'Sorveteria Chiquinho & Blaus',
                'business_name' => 'Chiquinho Sorvetes Lagoa',
                'cnpj_cpf' => '42.222.333/0001-20',
                'address' => 'Rua Saldanha Marinho, 1150 - Centro, Guarapuava - PR',
                'lat' => -25.39120000,
                'lng' => -51.46150000,
            ],
            [
                'email' => 'shopping@zarpa.com.br',
                'name' => 'Shopping Cidade dos Lagos Lojas',
                'business_name' => 'Shopping Cidade dos Lagos - Hub Lojistas',
                'cnpj_cpf' => '42.333.444/0001-30',
                'address' => 'Avenida Guarapuava, 1400 - Cidade dos Lagos, Guarapuava - PR',
                'lat' => -25.36150000,
                'lng' => -51.44850000,
            ],
            [
                'email' => 'superpao@zarpa.com.br',
                'name' => 'Superpão Compre Mais',
                'business_name' => 'Superpão Compre Mais Bonsucesso',
                'cnpj_cpf' => '42.444.555/0001-40',
                'address' => 'Avenida Manoel Ribas, 3800 - Bonsucesso, Guarapuava - PR',
                'lat' => -25.38800000,
                'lng' => -51.48200000,
            ],
            [
                'email' => 'dalpozzo@zarpa.com.br',
                'name' => 'Hipermercado Dal Pozzo',
                'business_name' => 'Hiper Dal Pozzo Vila Carli',
                'cnpj_cpf' => '42.555.666/0001-50',
                'address' => 'Avenida Moacir Júlio Silvestri, 1450 - Vila Carli, Guarapuava - PR',
                'lat' => -25.40500000,
                'lng' => -51.45500000,
            ],
            [
                'email' => 'farmacia@zarpa.com.br',
                'name' => 'Farmácia São João Centro',
                'business_name' => 'Farmácia São João XV de Novembro',
                'cnpj_cpf' => '42.666.777/0001-60',
                'address' => 'Rua XV de Novembro, 7200 - Centro, Guarapuava - PR',
                'lat' => -25.39300000,
                'lng' => -51.46400000,
            ],
            [
                'email' => 'paodemel@zarpa.com.br',
                'name' => 'Confeitaria Pão de Mel Batel',
                'business_name' => 'Panificadora & Confeitaria Pão de Mel',
                'cnpj_cpf' => '42.777.888/0001-70',
                'address' => 'Rua Brigadeiro Rocha, 2400 - Batel, Guarapuava - PR',
                'lat' => -25.39700000,
                'lng' => -51.45800000,
            ],
        ];

        $clientMap = [];
        foreach ($merchants as $m) {
            $user = User::firstOrCreate(
                ['email' => $m['email']],
                [
                    'name' => $m['name'],
                    'password' => Hash::make('lojista123456'),
                    'role' => 'client',
                    'phone' => '(42) 99888-7777',
                ]
            );

            $client = Client::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'business_name' => $m['business_name'],
                    'cnpj_cpf' => $m['cnpj_cpf'],
                    'default_address' => $m['address'],
                    'default_lat' => $m['lat'],
                    'default_lng' => $m['lng'],
                ]
            );

            DB::statement("
                UPDATE clients 
                SET default_location = ST_SetSRID(ST_MakePoint(default_lng, default_lat), 4326)
                WHERE id = {$client->id} AND default_lat IS NOT NULL AND default_lng IS NOT NULL;
            ");

            $clientMap[$m['email']] = $client;
        }

        // ==============================================================
        // 2. ENTREGADORES ESTRATÉGICOS POR QUADRANTE DE GUARAPUAVA
        // ==============================================================
        $couriers = [
            [
                'email' => 'rafael.expresso@zarpa.com.br',
                'name' => 'Rafael Lima (Polo Centro - Radar Expresso)',
                'cnh' => '11223344556',
                'vehicle_type' => 'motorcycle',
                'vehicle_plate' => 'ZAR7A01',
                'lat' => -25.39350000,
                'lng' => -51.46250000,
                'radius' => 6.00,
            ],
            [
                'email' => 'marcos.moto@zarpa.com.br',
                'name' => 'Marcos Silva (Polo Bonsucesso/UTFPR)',
                'cnh' => '98765432101',
                'vehicle_type' => 'motorcycle',
                'vehicle_plate' => 'ZAR4P11',
                'lat' => -25.36200000,
                'lng' => -51.46500000,
                'radius' => 8.00,
            ],
            [
                'email' => 'lucas.bike@zarpa.com.br',
                'name' => 'Lucas Pereira (Polo Santa Cruz/UNICENTRO)',
                'cnh' => '87654321092',
                'vehicle_type' => 'bicycle',
                'vehicle_plate' => 'ZAR4P22',
                'lat' => -25.38900000,
                'lng' => -51.47200000,
                'radius' => 5.00,
            ],
            [
                'email' => 'andre.carro@zarpa.com.br',
                'name' => 'André Martins (Polo Cidade dos Lagos - Utilitário)',
                'cnh' => '76543210983',
                'vehicle_type' => 'car',
                'vehicle_plate' => 'ZAR4P33',
                'lat' => -25.36300000,
                'lng' => -51.44600000,
                'radius' => 15.00,
            ],
        ];

        $courierMap = [];
        foreach ($couriers as $c) {
            $user = User::firstOrCreate(
                ['email' => $c['email']],
                [
                    'name' => $c['name'],
                    'password' => Hash::make('entregador123456'),
                    'role' => 'courier',
                    'phone' => '(42) 99111-3333',
                ]
            );

            $courier = Courier::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'cnh' => $c['cnh'],
                    'vehicle_type' => $c['vehicle_type'],
                    'vehicle_plate' => $c['vehicle_plate'],
                    'current_lat' => $c['lat'],
                    'current_lng' => $c['lng'],
                    'cluster_radius_km' => $c['radius'],
                    'is_online' => true,
                    'is_active' => true,
                ]
            );

            DB::statement("
                UPDATE couriers 
                SET current_location = ST_SetSRID(ST_MakePoint(current_lng, current_lat), 4326)
                WHERE id = {$courier->id} AND current_lat IS NOT NULL AND current_lng IS NOT NULL;
            ");

            $courierMap[$c['email']] = $courier;
        }

        // ==============================================================
        // 3. CENÁRIO 1: PEDIDOS EXPRESSOS ON-DEMAND (RADAR & CONCORRÊNCIA)
        // ==============================================================
        $expressOrders = [
            [
                'client_email' => 'mcdonalds@zarpa.com.br',
                'desc' => 'Combo Super Burger Express (Urgente - Almoço)',
                'weight' => 1.2,
                'volume' => 0.006,
                'origin_addr' => 'Rua Vicente Machado, 1400 - Centro, Guarapuava - PR',
                'origin_lat' => -25.39420000,
                'origin_lng' => -51.46350000,
                'dest_addr' => 'Rua Brigadeiro Rocha, 1900 - Batel, Guarapuava - PR',
                'dest_lat' => -25.39650000,
                'dest_lng' => -51.45900000,
                'status' => 'pending',
            ],
            [
                'client_email' => 'farmacia@zarpa.com.br',
                'desc' => 'Medicamento Térmico Antibiótico (Entrega Imediata)',
                'weight' => 0.4,
                'volume' => 0.002,
                'origin_addr' => 'Rua XV de Novembro, 7200 - Centro, Guarapuava - PR',
                'origin_lat' => -25.39300000,
                'origin_lng' => -51.46400000,
                'dest_addr' => 'Rua Guaíra, 3100 - Santana, Guarapuava - PR',
                'dest_lat' => -25.38500000,
                'dest_lng' => -51.45500000,
                'status' => 'pending',
            ],
            [
                'client_email' => 'paodemel@zarpa.com.br',
                'desc' => 'Bolo de Aniversário e Salgados Finos',
                'weight' => 2.5,
                'volume' => 0.015,
                'origin_addr' => 'Rua Brigadeiro Rocha, 2400 - Batel, Guarapuava - PR',
                'origin_lat' => -25.39700000,
                'origin_lng' => -51.45800000,
                'dest_addr' => 'Rua Padre Chagas, 3400 - Santa Cruz, Guarapuava - PR',
                'dest_lat' => -25.39100000,
                'dest_lng' => -51.46900000,
                'status' => 'pending',
            ],
        ];

        foreach ($expressOrders as $exp) {
            $client = $clientMap[$exp['client_email']] ?? null;
            if (!$client) {
                continue;
            }

            $exists = Order::where('client_id', $client->id)
                ->where('package_description', $exp['desc'])
                ->first();

            if ($exists) {
                continue;
            }

            $routeData = $routingService->calculateRoute(
                $exp['origin_lat'],
                $exp['origin_lng'],
                $exp['dest_lat'],
                $exp['dest_lng']
            );

            $distanceKm = $routeData['distance_km'] ?? 2.8;
            $durationMin = $routeData['duration_minutes'] ?? 8;
            $freight = $freightCalculator->calculate($distanceKm, $exp['weight'], 'express');

            Order::create([
                'client_id' => $client->id,
                'courier_id' => null,
                'package_description' => $exp['desc'],
                'package_weight_kg' => $exp['weight'],
                'package_volume_m3' => $exp['volume'],
                'shipping_type' => 'express',
                'status' => $exp['status'],
                'is_anchor' => false,
                'individual_freight_price' => $freight['individual_price'],
                'final_freight_price' => $freight['individual_price'],
                'distance_km' => $distanceKm,
                'estimated_duration_minutes' => $durationMin,
                'route_geometry' => $routeData['polyline_geometry'] ?? null,
                'origin_address' => $exp['origin_addr'],
                'dest_address' => $exp['dest_addr'],
                'origin_lat' => $exp['origin_lat'],
                'origin_lng' => $exp['origin_lng'],
                'dest_lat' => $exp['dest_lat'],
                'dest_lng' => $exp['dest_lng'],
            ]);
        }

        // ==============================================================
        // 4. CENÁRIO 2: PEDIDOS ECONÔMICOS PRONTOS PARA BATCH (CLUSTERIZAÇÃO)
        // ==============================================================
        $economicOrders = [
            // Eixo Centro -> Bonsucesso / UTFPR
            [
                'client_email' => 'chiquinho@zarpa.com.br',
                'desc' => 'Potes de Açaí e Milk-shake Família',
                'weight' => 2.2,
                'volume' => 0.010,
                'origin_addr' => 'Rua Saldanha Marinho, 1150 - Centro, Guarapuava - PR',
                'origin_lat' => -25.39120000,
                'origin_lng' => -51.46150000,
                'dest_addr' => 'Av. Laura Pacheco Bastos, 650 - Bonsucesso, Guarapuava - PR',
                'dest_lat' => -25.35900000,
                'dest_lng' => -51.46700000,
                'is_anchor' => false,
            ],
            [
                'client_email' => 'superpao@zarpa.com.br',
                'desc' => 'Pacote de Frios e Pães Especiais',
                'weight' => 3.0,
                'volume' => 0.016,
                'origin_addr' => 'Avenida Manoel Ribas, 3800 - Bonsucesso, Guarapuava - PR',
                'origin_lat' => -25.38800000,
                'origin_lng' => -51.48200000,
                'dest_addr' => 'Rua Capitão Rocha, 1800 - Centro, Guarapuava - PR',
                'dest_lat' => -25.39200000,
                'dest_lng' => -51.46300000,
                'is_anchor' => false,
            ],
            [
                'client_email' => 'paodemel@zarpa.com.br',
                'desc' => 'Encomenda de Pães Doces e Tortas',
                'weight' => 3.5,
                'volume' => 0.018,
                'origin_addr' => 'Rua Brigadeiro Rocha, 2400 - Batel, Guarapuava - PR',
                'origin_lat' => -25.39700000,
                'origin_lng' => -51.45800000,
                'dest_addr' => 'Rua Padre Salvador, 350 - Bonsucesso, Guarapuava - PR',
                'dest_lat' => -25.36500000,
                'dest_lng' => -51.46400000,
                'is_anchor' => false,
            ],

            // Eixo Cidade dos Lagos -> Vila Carli / Santana
            [
                'client_email' => 'shopping@zarpa.com.br',
                'desc' => 'Calçados e Encomenda Vestuário Cidade dos Lagos',
                'weight' => 2.0,
                'volume' => 0.015,
                'origin_addr' => 'Avenida Guarapuava, 1400 - Cidade dos Lagos, Guarapuava - PR',
                'origin_lat' => -25.36150000,
                'origin_lng' => -51.44850000,
                'dest_addr' => 'Rua Senador Pinheiro Machado, 2100 - Santana, Guarapuava - PR',
                'dest_lat' => -25.38400000,
                'dest_lng' => -51.45700000,
                'is_anchor' => true,
            ],
            [
                'client_email' => 'dalpozzo@zarpa.com.br',
                'desc' => 'Artigos de Bazar e Limpeza Hiper',
                'weight' => 4.0,
                'volume' => 0.024,
                'origin_addr' => 'Avenida Moacir Júlio Silvestri, 1450 - Vila Carli, Guarapuava - PR',
                'origin_lat' => -25.40500000,
                'origin_lng' => -51.45500000,
                'dest_addr' => 'Rua Capitão Frederico Virmond, 1500 - Santa Cruz, Guarapuava - PR',
                'dest_lat' => -25.39300000,
                'dest_lng' => -51.46800000,
                'is_anchor' => false,
            ],
        ];

        foreach ($economicOrders as $eco) {
            $client = $clientMap[$eco['client_email']] ?? null;
            if (!$client) {
                continue;
            }

            $exists = Order::where('client_id', $client->id)
                ->where('package_description', $eco['desc'])
                ->first();

            if ($exists) {
                continue;
            }

            $routeData = $routingService->calculateRoute(
                $eco['origin_lat'],
                $eco['origin_lng'],
                $eco['dest_lat'],
                $eco['dest_lng']
            );

            $distanceKm = $routeData['distance_km'] ?? 3.2;
            $durationMin = $routeData['duration_minutes'] ?? 9;
            $freight = $freightCalculator->calculate($distanceKm, $eco['weight'], 'economic');

            Order::create([
                'client_id' => $client->id,
                'courier_id' => null,
                'package_description' => $eco['desc'],
                'package_weight_kg' => $eco['weight'],
                'package_volume_m3' => $eco['volume'],
                'shipping_type' => 'economic',
                'status' => 'pending',
                'is_anchor' => $eco['is_anchor'],
                'individual_freight_price' => $freight['individual_price'],
                'final_freight_price' => null,
                'distance_km' => $distanceKm,
                'estimated_duration_minutes' => $durationMin,
                'route_geometry' => $routeData['polyline_geometry'] ?? null,
                'origin_address' => $eco['origin_addr'],
                'dest_address' => $eco['dest_addr'],
                'origin_lat' => $eco['origin_lat'],
                'origin_lng' => $eco['origin_lng'],
                'dest_lat' => $eco['dest_lat'],
                'dest_lng' => $eco['dest_lng'],
            ]);
        }
    }
}

