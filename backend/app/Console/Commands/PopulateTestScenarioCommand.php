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

        // 3. Cria 15 Pedidos Econômicos (5 em cada região compacta de Guarapuava)
        $ordersSpec = [
            // Cluster 1: Norte (UTFPR / Cidade dos Lagos / Bonsucesso) - 5 pedidos densos
            [
                'desc' => 'POPULATE: Cesta Tecnológica UTFPR #1',
                'orig_addr' => 'UTFPR Guarapuava, Av. Laura Pacheco Bastos, 800',
                'orig_lat' => -25.3880, 'orig_lng' => -51.4810,
                'dest_addr' => 'Shopping Cidade dos Lagos, Av. Guarapuava, 1400',
                'dest_lat' => -25.3884, 'dest_lng' => -51.4815,
                'weight' => 2.5, 'dist' => 1.5,
            ],
            [
                'desc' => 'POPULATE: Documentos Acadêmicos UTFPR #2',
                'orig_addr' => 'UTFPR Guarapuava, Av. Laura Pacheco Bastos, 800',
                'orig_lat' => -25.3880, 'orig_lng' => -51.4810,
                'dest_addr' => 'Hospital Regional Cidade dos Lagos',
                'dest_lat' => -25.3860, 'dest_lng' => -51.4830,
                'weight' => 1.0, 'dist' => 1.2,
            ],
            [
                'desc' => 'POPULATE: Suprimentos Shopping Cidade dos Lagos #3',
                'orig_addr' => 'Shopping Cidade dos Lagos, Loja 102',
                'orig_lat' => -25.3884, 'orig_lng' => -51.4815,
                'dest_addr' => 'Residencial Cidade dos Lagos, Rua das Palmeiras, 45',
                'dest_lat' => -25.3850, 'dest_lng' => -51.4820,
                'weight' => 3.0, 'dist' => 1.1,
            ],
            [
                'desc' => 'POPULATE: Peças Técnicas Cidade dos Lagos #4',
                'orig_addr' => 'Avenida Guarapuava, 1200 - Cidade dos Lagos',
                'orig_lat' => -25.3875, 'orig_lng' => -51.4818,
                'dest_addr' => 'UTFPR Laboratórios de Informática',
                'dest_lat' => -25.3880, 'dest_lng' => -51.4810,
                'weight' => 2.0, 'dist' => 0.9,
            ],
            [
                'desc' => 'POPULATE: Medicamentos Cidade dos Lagos #5',
                'orig_addr' => 'Farmácia Cidade dos Lagos, Av. Guarapuava',
                'orig_lat' => -25.3882, 'orig_lng' => -51.4812,
                'dest_addr' => 'Condomínio Araucária - Cidade dos Lagos',
                'dest_lat' => -25.3845, 'dest_lng' => -51.4825,
                'weight' => 1.5, 'dist' => 1.3,
            ],

            // Cluster 2: Centro (Saldanha Marinho / XV de Novembro / Parque do Lago) - 5 pedidos
            [
                'desc' => 'POPULATE: Superpão Centro #6',
                'orig_addr' => 'Superpão Compre Mais, Rua Saldanha Marinho, 1200',
                'orig_lat' => -25.3905, 'orig_lng' => -51.4628,
                'dest_addr' => 'Praça 9 de Dezembro, Centro',
                'dest_lat' => -25.3954, 'dest_lng' => -51.4641,
                'weight' => 3.5, 'dist' => 1.4,
            ],
            [
                'desc' => 'POPULATE: Farmácia São João Centro #7',
                'orig_addr' => 'Rua XV de Novembro, 7200 - Centro',
                'orig_lat' => -25.3930, 'orig_lng' => -51.4640,
                'dest_addr' => 'Rua Vicente Machado, 1400 - Centro',
                'dest_lat' => -25.3942, 'dest_lng' => -51.4635,
                'weight' => 1.2, 'dist' => 0.8,
            ],
            [
                'desc' => 'POPULATE: Chiquinho Sorvetes #8',
                'orig_addr' => 'Rua Saldanha Marinho, 1150 - Centro',
                'orig_lat' => -25.3912, 'orig_lng' => -51.4615,
                'dest_addr' => 'Lagoa das Lágrimas, Rua Brigadeiro Rocha',
                'dest_lat' => -25.3925, 'dest_lng' => -51.4625,
                'weight' => 2.0, 'dist' => 0.7,
            ],
            [
                'desc' => 'POPULATE: Padaria Central #9',
                'orig_addr' => 'Rua Saldanha Marinho, 1200 - Centro',
                'orig_lat' => -25.3905, 'orig_lng' => -51.4628,
                'dest_addr' => 'Parque do Lago, Rua Padre Salvador',
                'dest_lat' => -25.3983, 'dest_lng' => -51.4707,
                'weight' => 1.8, 'dist' => 1.6,
            ],
            [
                'desc' => 'POPULATE: McDonald\'s Centro #10',
                'orig_addr' => 'Rua Vicente Machado, 1400 - Centro',
                'orig_lat' => -25.3942, 'orig_lng' => -51.4635,
                'dest_addr' => 'Prefeitura Municipal, Rua Brigadeiro Rocha, 2777',
                'dest_lat' => -25.3948, 'dest_lng' => -51.4632,
                'weight' => 2.2, 'dist' => 0.6,
            ],

            // Cluster 3: Sul / Vila Carli / CEDETEG - 5 pedidos densos
            [
                'desc' => 'POPULATE: Laboratório UNICENTRO Cedeteg #11',
                'orig_addr' => 'UNICENTRO Cedeteg, Alameda Élio Antonio Dalla Vecchia, 838',
                'orig_lat' => -25.38339, 'orig_lng' => -51.48818,
                'dest_addr' => 'Bairro Vila Carli, Rua Guaranis, 300',
                'dest_lat' => -25.38500, 'dest_lng' => -51.48600,
                'weight' => 2.0, 'dist' => 1.1,
            ],
            [
                'desc' => 'POPULATE: Materiais Cedeteg #12',
                'orig_addr' => 'UNICENTRO Cedeteg Bloco Central',
                'orig_lat' => -25.38339, 'orig_lng' => -51.48818,
                'dest_addr' => 'Residencial Universitário Cedeteg',
                'dest_lat' => -25.38200, 'dest_lng' => -51.48900,
                'weight' => 3.0, 'dist' => 0.8,
            ],
            [
                'desc' => 'POPULATE: Dal Pozzo Vila Carli #13',
                'orig_addr' => 'Hipermercado Dal Pozzo, Av. Moacir Júlio Silvestri, 1450',
                'orig_lat' => -25.4050, 'orig_lng' => -51.4550,
                'dest_addr' => 'Terminal Rodoviário de Guarapuava',
                'dest_lat' => -25.3780, 'dest_lng' => -51.4650,
                'weight' => 4.0, 'dist' => 2.5,
            ],
            [
                'desc' => 'POPULATE: Drogaria Cedeteg #14',
                'orig_addr' => 'Alameda Élio Antonio Dalla Vecchia, 500',
                'orig_lat' => -25.38400, 'orig_lng' => -51.48700,
                'dest_addr' => 'UNICENTRO Câmpus Cedeteg Biblioteca',
                'dest_lat' => -25.38339, 'dest_lng' => -51.48818,
                'weight' => 1.2, 'dist' => 0.6,
            ],
            [
                'desc' => 'POPULATE: Papelaria Universitária #15',
                'orig_addr' => 'Rua Simeão Varela de Sá, 100 - Cedeteg',
                'orig_lat' => -25.38380, 'orig_lng' => -51.48750,
                'dest_addr' => 'Colégio Estadual Cedeteg',
                'dest_lat' => -25.38450, 'dest_lng' => -51.48650,
                'weight' => 2.5, 'dist' => 0.9,
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

