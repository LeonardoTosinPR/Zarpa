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

class EconomicBatchSeeder extends Seeder
{
    /**
     * Run the database seeds for Guarapuava landmarks, merchants, couriers and batch orders.
     */
    public function run(): void
    {
        $routingService = app(OsrmRoutingService::class);
        $freightCalculator = app(FreightCalculatorService::class);

        // ==========================================
        // 1. LOJISTAS / ESTABELECIMENTOS DE GUARAPUAVA
        // ==========================================
        $merchantsData = [
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
                'address' => 'Rua Padre Chagas, 2200 - Centro / Bonsucesso, Guarapuava - PR',
                'lat' => -25.38500000,
                'lng' => -51.46500000,
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
        ];

        $clientModels = [];
        foreach ($merchantsData as $m) {
            $user = User::firstOrCreate(
                ['email' => $m['email']],
                [
                    'name' => $m['name'],
                    'password' => Hash::make('lojista123456'),
                    'role' => 'client',
                    'phone' => '(42) 99888-0000',
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

            $clientModels[$m['email']] = $client;
        }

        // ==========================================
        // 2. ENTREGADORES PARCEIROS POR POLO
        // ==========================================
        $couriersData = [
            [
                'email' => 'marcos.moto@zarpa.com.br',
                'name' => 'Marcos Silva (Pólo Bonsucesso/UTFPR)',
                'cnh' => '98765432101',
                'vehicle_type' => 'motorcycle',
                'vehicle_plate' => 'ZAR4P11',
                'lat' => -25.36200000,
                'lng' => -51.46500000,
                'radius' => 8.00,
            ],
            [
                'email' => 'lucas.bike@zarpa.com.br',
                'name' => 'Lucas Pereira (Pólo Santa Cruz/UNICENTRO)',
                'cnh' => '87654321092',
                'vehicle_type' => 'bicycle',
                'vehicle_plate' => 'ZAR4P22',
                'lat' => -25.38900000,
                'lng' => -51.47200000,
                'radius' => 5.00,
            ],
            [
                'email' => 'andre.carro@zarpa.com.br',
                'name' => 'André Martins (Pólo Cidade dos Lagos - Furgão)',
                'cnh' => '76543210983',
                'vehicle_type' => 'car',
                'vehicle_plate' => 'ZAR4P33',
                'lat' => -25.36300000,
                'lng' => -51.44600000,
                'radius' => 15.00,
            ],
        ];

        foreach ($couriersData as $c) {
            $user = User::firstOrCreate(
                ['email' => $c['email']],
                [
                    'name' => $c['name'],
                    'password' => Hash::make('entregador123456'),
                    'role' => 'courier',
                    'phone' => '(42) 99111-2222',
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
        }

        // ==========================================
        // 3. PEDIDOS ECONÔMICOS PRONTOS PARA BATCH
        // ==========================================
        $economicOrdersToSeed = [
            // Cluster A: Região Centro -> Bonsucesso / UTFPR
            [
                'client_email' => 'mcdonalds@zarpa.com.br',
                'desc' => 'Lanche Combo Noturno e Sobremesa',
                'weight' => 1.8,
                'volume' => 0.008,
                'origin_addr' => 'Rua Vicente Machado, 1400 - Centro, Guarapuava - PR',
                'origin_lat' => -25.39420000,
                'origin_lng' => -51.46350000,
                'dest_addr' => 'UTFPR Câmpus Guarapuava - Av. Laura Pacheco Bastos, 800 - Bonsucesso, Guarapuava - PR',
                'dest_lat' => -25.35820000,
                'dest_lng' => -51.46820000,
                'is_anchor' => true,
            ],
            [
                'client_email' => 'superpao@zarpa.com.br',
                'desc' => 'Caixa de Mantimentos e Produtos de Limpeza',
                'weight' => 4.5,
                'volume' => 0.025,
                'origin_addr' => 'Rua Padre Chagas, 2200 - Centro / Bonsucesso, Guarapuava - PR',
                'origin_lat' => -25.38500000,
                'origin_lng' => -51.46500000,
                'dest_addr' => 'Residencial Morada dos Pássaros, Bonsucesso, Guarapuava - PR',
                'dest_lat' => -25.36800000,
                'dest_lng' => -51.46200000,
                'is_anchor' => false,
            ],
            [
                'client_email' => 'chiquinho@zarpa.com.br',
                'desc' => 'Potes de Sorvete e Caldas Térmicas',
                'weight' => 2.0,
                'volume' => 0.012,
                'origin_addr' => 'Rua Saldanha Marinho, 1150 - Centro, Guarapuava - PR',
                'origin_lat' => -25.39120000,
                'origin_lng' => -51.46150000,
                'dest_addr' => 'Bairro Santana Residencial - Rua Rosa Siqueira, Santana, Guarapuava - PR',
                'dest_lat' => -25.38200000,
                'dest_lng' => -51.45600000,
                'is_anchor' => false,
            ],

            // Cluster B: Região Centro -> UNICENTRO Santa Cruz / Parque do Lago
            [
                'client_email' => 'farmacia@zarpa.com.br',
                'desc' => 'Medicamentos e Suplementos Vitamínicos',
                'weight' => 0.8,
                'volume' => 0.004,
                'origin_addr' => 'Rua XV de Novembro, 7200 - Centro, Guarapuava - PR',
                'origin_lat' => -25.39300000,
                'origin_lng' => -51.46400000,
                'dest_addr' => 'UNICENTRO Câmpus Santa Cruz - Rua Salvatore Renna, 875 - Santa Cruz, Guarapuava - PR',
                'dest_lat' => -25.38880000,
                'dest_lng' => -51.47450000,
                'is_anchor' => false,
            ],
            [
                'client_email' => 'chiquinho@zarpa.com.br',
                'desc' => 'Tortas e Milk-shakes Congelados',
                'weight' => 2.5,
                'volume' => 0.015,
                'origin_addr' => 'Rua Saldanha Marinho, 1150 - Centro, Guarapuava - PR',
                'origin_lat' => -25.39120000,
                'origin_lng' => -51.46150000,
                'dest_addr' => 'Parque do Lago Residencial - Rua Salvatore Renna, Lagoa, Guarapuava - PR',
                'dest_lat' => -25.39900000,
                'dest_lng' => -51.46700000,
                'is_anchor' => false,
            ],
            [
                'client_email' => 'superpao@zarpa.com.br',
                'desc' => 'Cesta de Café da Manhã Corporativo',
                'weight' => 3.2,
                'volume' => 0.018,
                'origin_addr' => 'Rua Padre Chagas, 2200 - Centro / Bonsucesso, Guarapuava - PR',
                'origin_lat' => -25.38500000,
                'origin_lng' => -51.46500000,
                'dest_addr' => 'Trianon Residencial - Rua Brigadeiro Rocha, Trianon, Guarapuava - PR',
                'dest_lat' => -25.39800000,
                'dest_lng' => -51.45800000,
                'is_anchor' => false,
            ],

            // Cluster C: Região Cidade dos Lagos / Vila Carli -> UNICENTRO Cedeteg / Hospital
            [
                'client_email' => 'shopping@zarpa.com.br',
                'desc' => 'Peças de Vestuário e Calçados',
                'weight' => 2.2,
                'volume' => 0.020,
                'origin_addr' => 'Avenida Guarapuava, 1400 - Cidade dos Lagos, Guarapuava - PR',
                'origin_lat' => -25.36150000,
                'origin_lng' => -51.44850000,
                'dest_addr' => 'UNICENTRO Câmpus Cedeteg - Alameda Érico Veríssimo, 1075 - Vila Carli, Guarapuava - PR',
                'dest_lat' => -25.41200000,
                'dest_lng' => -51.44200000,
                'is_anchor' => true,
            ],
            [
                'client_email' => 'dalpozzo@zarpa.com.br',
                'desc' => 'Caixa Térmica com Carnes Nobres e Bebidas',
                'weight' => 5.0,
                'volume' => 0.030,
                'origin_addr' => 'Avenida Moacir Júlio Silvestri, 1450 - Vila Carli, Guarapuava - PR',
                'origin_lat' => -25.40500000,
                'origin_lng' => -51.45500000,
                'dest_addr' => 'Hospital Regional de Guarapuava - Av. Bento Munhoz da Rocha Neto, Primavera',
                'dest_lat' => -25.40800000,
                'dest_lng' => -51.48200000,
                'is_anchor' => false,
            ],
        ];

        foreach ($economicOrdersToSeed as $ord) {
            $client = $clientModels[$ord['client_email']] ?? null;
            if (!$client) {
                continue;
            }

            // Evita duplicar se o pedido já existe com mesma descrição para o cliente
            $exists = Order::where('client_id', $client->id)
                ->where('package_description', $ord['desc'])
                ->first();

            if ($exists) {
                continue;
            }

            // Calcula rota isolada para ter valores precisos
            $routeData = $routingService->calculateRoute(
                $ord['origin_lat'],
                $ord['origin_lng'],
                $ord['dest_lat'],
                $ord['dest_lng']
            );

            $distanceKm = $routeData['distance_km'] ?? 3.5;
            $durationMin = $routeData['duration_minutes'] ?? 10;
            $freight = $freightCalculator->calculate($distanceKm, $ord['weight'], 'economic');

            Order::create([
                'client_id' => $client->id,
                'courier_id' => null,
                'package_description' => $ord['desc'],
                'package_weight_kg' => $ord['weight'],
                'package_volume_m3' => $ord['volume'],
                'shipping_type' => 'economic',
                'status' => 'pending',
                'is_anchor' => $ord['is_anchor'],
                'individual_freight_price' => $freight['individual_price'],
                'final_freight_price' => null,
                'distance_km' => $distanceKm,
                'estimated_duration_minutes' => $durationMin,
                'route_geometry' => $routeData['polyline_geometry'] ?? null,
                'origin_address' => $ord['origin_addr'],
                'dest_address' => $ord['dest_addr'],
                'origin_lat' => $ord['origin_lat'],
                'origin_lng' => $ord['origin_lng'],
                'dest_lat' => $ord['dest_lat'],
                'dest_lng' => $ord['dest_lng'],
            ]);
        }
    }
}
