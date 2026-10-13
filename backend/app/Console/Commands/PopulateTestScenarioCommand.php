<?php

namespace App\Console\Commands;

use App\Models\Client;
use App\Models\Courier;
use App\Models\DeliveryGroup;
use App\Models\Order;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PopulateTestScenarioCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:populate';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Popula o cenário de homologação com 3 entregadores e 15 pedidos econômicos de Guarapuava';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('⚡ Populando cenário de teste de Guarapuava (3 entregadores, 15 pedidos econômicos)...');

        // 1. Cria ou recupera Lojista
        $merchantUser = User::firstOrCreate(
            ['email' => 'lojista.populate@zarpa.com.br'],
            [
                'name' => 'Supermercado Compre Mais Guarapuava',
                'password' => bcrypt('secret123'),
                'role' => 'client',
                'phone' => '(42) 3622-1000',
            ]
        );

        $client = Client::firstOrCreate(
            ['user_id' => $merchantUser->id],
            [
                'business_name' => 'Supermercado Compre Mais',
                'cnpj_cpf' => '01.234.567/0001-89',
                'default_address' => 'Rua Saldanha Marinho, 1500 - Centro',
                'default_lat' => -25.3905,
                'default_lng' => -51.4628,
            ]
        );

        // 2. Garante os 3 Entregadores em Pólos Distintos de Guarapuava
        // O entregador oficial de testes (entregador@zarpa.com.br) assume o Pólo Centro
        $couriersData = [
            [
                'email' => 'entregador@zarpa.com.br',
                'name' => 'Carlos Motoboy (Pólo Centro)',
                'phone' => '(42) 97777-2222',
                'cnh' => '12345678900',
                'plate' => 'BRA2E19',
                'lat' => -25.3905,
                'lng' => -51.4628,
                'radius' => 8.0,
            ],
            [
                'email' => 'lucas.utfpr@zarpa.com.br',
                'name' => 'Lucas Entregador (Pólo UTFPR/Norte)',
                'phone' => '(42) 99888-0001',
                'cnh' => '11111111101',
                'plate' => 'ZAR1N01',
                'lat' => -25.3582,
                'lng' => -51.4682,
                'radius' => 8.0,
            ],
            [
                'email' => 'mateus.cedeteg@zarpa.com.br',
                'name' => 'Mateus Entregador (Pólo Vila Carli/Sul)',
                'phone' => '(42) 99888-0003',
                'cnh' => '33333333303',
                'plate' => 'ZAR3S03',
                'lat' => -25.4215,
                'lng' => -51.4725,
                'radius' => 8.0,
            ],
        ];

        foreach ($couriersData as $c) {
            $u = User::firstOrCreate(
                ['email' => $c['email']],
                [
                    'name' => $c['name'],
                    'password' => bcrypt('secret123'),
                    'role' => 'courier',
                    'phone' => $c['phone'],
                ]
            );

            Courier::updateOrCreate(
                ['user_id' => $u->id],
                [
                    'cnh' => $c['cnh'],
                    'vehicle_type' => 'motorcycle',
                    'vehicle_plate' => $c['plate'],
                    'current_lat' => $c['lat'],
                    'current_lng' => $c['lng'],
                    'cluster_radius_km' => $c['radius'],
                    'is_online' => true,
                    'is_active' => true,
                ]
            );
        }

        // Limpa pedidos anteriores de teste para ter o cenário isolado de 15 pedidos
        Order::where('package_description', 'like', 'POPULATE:%')->delete();
        // Remove lotes órfãos sem pedidos resultantes de deleções anteriores
        DeliveryGroup::whereDoesntHave('orders')->delete();

        // 3. Cria 15 Pedidos Econômicos (5 em cada região)
        $ordersSpec = [
            // Cluster 1: Norte (UTFPR / Bonsucesso / Cidade dos Lagos) - 5 pedidos
            [
                'desc' => 'POPULATE: Cesta Tecnológica UTFPR #1',
                'orig_addr' => 'UTFPR Guarapuava, Bonsucesso',
                'orig_lat' => -25.3582, 'orig_lng' => -51.4682,
                'dest_addr' => 'Shopping Cidade dos Lagos',
                'dest_lat' => -25.3520, 'dest_lng' => -51.4710,
                'weight' => 2.5, 'dist' => 1.8,
            ],
            [
                'desc' => 'POPULATE: Documentos Acadêmicos UTFPR #2',
                'orig_addr' => 'UTFPR Guarapuava, Bonsucesso',
                'orig_lat' => -25.3582, 'orig_lng' => -51.4682,
                'dest_addr' => 'Hospital Regional Cidade dos Lagos',
                'dest_lat' => -25.3540, 'dest_lng' => -51.4690,
                'weight' => 1.0, 'dist' => 1.2,
            ],
            [
                'desc' => 'POPULATE: Suprimentos UTFPR #3',
                'orig_addr' => 'Av. Professora Laura, 500 - Bonsucesso',
                'orig_lat' => -25.3600, 'orig_lng' => -51.4670,
                'dest_addr' => 'Bairro São Cristóvão',
                'dest_lat' => -25.3650, 'dest_lng' => -51.4640,
                'weight' => 3.0, 'dist' => 2.1,
            ],
            [
                'desc' => 'POPULATE: Peças Técnicas Bonsucesso #4',
                'orig_addr' => 'Rua Salvatore, 100 - Bonsucesso',
                'orig_lat' => -25.3590, 'orig_lng' => -51.4660,
                'dest_addr' => 'Condomínio Cidade dos Lagos',
                'dest_lat' => -25.3530, 'dest_lng' => -51.4720,
                'weight' => 2.0, 'dist' => 1.9,
            ],
            [
                'desc' => 'POPULATE: Medicamentos Bonsucesso #5',
                'orig_addr' => 'Av. Manoel Ribas, 4000 - Bonsucesso',
                'orig_lat' => -25.3610, 'orig_lng' => -51.4650,
                'dest_addr' => 'Residencial Bonsucesso',
                'dest_lat' => -25.3570, 'dest_lng' => -51.4675,
                'weight' => 1.5, 'dist' => 1.4,
            ],

            // Cluster 2: Centro (Saldanha Marinho / XV de Novembro / Santa Cruz) - 5 pedidos
            [
                'desc' => 'POPULATE: Superpão Centro #6',
                'orig_addr' => 'Superpão Compre Mais, Centro',
                'orig_lat' => -25.3905, 'orig_lng' => -51.4628,
                'dest_addr' => 'UNICENTRO Campus Santa Cruz',
                'dest_lat' => -25.3888, 'dest_lng' => -51.4745,
                'weight' => 3.5, 'dist' => 2.2,
            ],
            [
                'desc' => 'POPULATE: Farmácia Trajano Centro #7',
                'orig_addr' => 'Rua Saldanha Marinho, 1200 - Centro',
                'orig_lat' => -25.3920, 'orig_lng' => -51.4630,
                'dest_addr' => 'Rua Vicente Machado, 1500 - Centro',
                'dest_lat' => -25.3940, 'dest_lng' => -51.4650,
                'weight' => 1.2, 'dist' => 1.0,
            ],
            [
                'desc' => 'POPULATE: Livraria Leopoldo #8',
                'orig_addr' => 'Rua XV de Novembro, 7100 - Centro',
                'orig_lat' => -25.3910, 'orig_lng' => -51.4610,
                'dest_addr' => 'Praça Cleve, Centro',
                'dest_lat' => -25.3935, 'dest_lng' => -51.4645,
                'weight' => 2.0, 'dist' => 1.3,
            ],
            [
                'desc' => 'POPULATE: Sorveteria Emy Centro #9',
                'orig_addr' => 'Rua Saldanha Marinho, 900 - Centro',
                'orig_lat' => -25.3930, 'orig_lng' => -51.4620,
                'dest_addr' => 'Parque do Lago, Centro',
                'dest_lat' => -25.3980, 'dest_lng' => -51.4690,
                'weight' => 1.8, 'dist' => 1.7,
            ],
            [
                'desc' => 'POPULATE: McDonald\'s Centro #10',
                'orig_addr' => 'McDonald\'s Guarapuava, Centro',
                'orig_lat' => -25.3900, 'orig_lng' => -51.4640,
                'dest_addr' => 'Rua Padre Chagas, 2000 - Centro',
                'dest_lat' => -25.3950, 'dest_lng' => -51.4660,
                'weight' => 2.2, 'dist' => 1.5,
            ],

            // Cluster 3: Sul (Vila Carli / Cedeteg / Rodoviária) - 5 pedidos
            [
                'desc' => 'POPULATE: Laboratório UNICENTRO Cedeteg #11',
                'orig_addr' => 'UNICENTRO Cedeteg, Vila Carli',
                'orig_lat' => -25.4215, 'orig_lng' => -51.4725,
                'dest_addr' => 'Bairro Vila Carli Norte',
                'dest_lat' => -25.4150, 'dest_lng' => -51.4700,
                'weight' => 2.0, 'dist' => 1.6,
            ],
            [
                'desc' => 'POPULATE: Materiais Cedeteg #12',
                'orig_addr' => 'UNICENTRO Cedeteg, Vila Carli',
                'orig_lat' => -25.4215, 'orig_lng' => -51.4725,
                'dest_addr' => 'Rodoviária de Guarapuava, Vila Carli',
                'dest_lat' => -25.4180, 'dest_lng' => -51.4750,
                'weight' => 3.0, 'dist' => 1.4,
            ],
            [
                'desc' => 'POPULATE: Dal Pozzo Vila Carli #13',
                'orig_addr' => 'Supermercado Dal Pozzo, Vila Carli',
                'orig_lat' => -25.4190, 'orig_lng' => -51.4710,
                'dest_addr' => 'Vila Bela, Sul',
                'dest_lat' => -25.4250, 'dest_lng' => -51.4760,
                'weight' => 4.0, 'dist' => 2.0,
            ],
            [
                'desc' => 'POPULATE: Drogaria Vila Carli #14',
                'orig_addr' => 'Av. Moacir Julio Silvestri, 1000 - Vila Carli',
                'orig_lat' => -25.4170, 'orig_lng' => -51.4690,
                'dest_addr' => 'Residencial Cedeteg',
                'dest_lat' => -25.4230, 'dest_lng' => -51.4740,
                'weight' => 1.2, 'dist' => 1.5,
            ],
            [
                'desc' => 'POPULATE: Papelaria Universitária Cedeteg #15',
                'orig_addr' => 'Rua Simeão Varela de Sá, 300 - Vila Carli',
                'orig_lat' => -25.4200, 'orig_lng' => -51.4730,
                'dest_addr' => 'Bairro Santana Sul',
                'dest_lat' => -25.4120, 'dest_lng' => -51.4680,
                'weight' => 2.5, 'dist' => 1.8,
            ],
        ];

        foreach ($ordersSpec as $idx => $spec) {
            Order::create([
                'client_id' => $client->id,
                'package_description' => $spec['desc'],
                'package_weight_kg' => $spec['weight'],
                'package_volume_m3' => 0.015,
                'shipping_type' => 'economic',
                'status' => 'pending',
                'is_anchor' => ($idx % 5 === 0),
                'individual_freight_price' => 16.00 + ($spec['dist'] * 2.0),
                'distance_km' => $spec['dist'],
                'estimated_duration_minutes' => (int) round($spec['dist'] * 3.5),
                'origin_address' => $spec['orig_addr'],
                'dest_address' => $spec['dest_addr'],
                'origin_lat' => $spec['orig_lat'],
                'origin_lng' => $spec['orig_lng'],
                'dest_lat' => $spec['dest_lat'],
                'dest_lng' => $spec['dest_lng'],
            ]);
        }

        $this->info("✅ Cenário populado com sucesso!");
        $this->line("• 3 Entregadores parceiros nos pólos: UTFPR, Centro e Cedeteg");
        $this->line("• 15 Pedidos econômicos pendentes (5 em cada pólo)");
        $this->line("• Execute 'php artisan zarpa:process-economic-batch' para agrupar 5 pedidos por condutor.");

        return Command::SUCCESS;
    }
}

