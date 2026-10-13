<?php

namespace App\Console\Commands;

use App\Models\Client;
use App\Models\Courier;
use App\Models\DeliveryGroup;
use App\Models\Order;
use App\Models\User;
use App\Services\FreightCalculatorService;
use App\Services\OsrmRoutingService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PopulateRandomMockOrdersCommand extends Command
{
    /**
     * O nome e assinatura do comando console.
     *
     * @var string
     */
    protected $signature = 'zarpa:mock-orders 
                            {--express=20 : Quantidade de pedidos expressos a gerar}
                            {--economic=50 : Quantidade de pedidos econômicos a gerar}
                            {--clean : Limpar pedidos mockados anteriores antes de gerar}';

    /**
     * A descrição do comando.
     *
     * @var string
     */
    protected $description = 'Gera uma lista realista de pedidos mockados distribuídos por Guarapuava (expressos e econômicos)';

    /**
     * Locais e estabelecimentos reais de Guarapuava (origens e destinos)
     */
    protected array $guarapuavaPlaces = [
        // Polo Norte / Cidade dos Lagos / Bonsucesso
        [
            'name' => 'UTFPR - Câmpus Guarapuava',
            'address' => 'Av. Professora Laura Pacheco Bastos, 800 - Bonsucesso',
            'lat' => -25.3494225, 'lng' => -51.4787116,
        ],
        [
            'name' => 'Shopping Cidade dos Lagos',
            'address' => 'Avenida Guarapuava, 1400 - Cidade dos Lagos',
            'lat' => -25.3520100, 'lng' => -51.4850200,
        ],
        [
            'name' => 'Hospital Regional Cidade dos Lagos',
            'address' => 'Rua Salvatore Renna, 450 - Cidade dos Lagos',
            'lat' => -25.3540000, 'lng' => -51.4795000,
        ],
        [
            'name' => 'Superpão Compre Mais Bonsucesso',
            'address' => 'Av. Manoel Ribas, 4100 - Bonsucesso',
            'lat' => -25.3620000, 'lng' => -51.4650000,
        ],
        [
            'name' => 'Farmácia Nissei Bonsucesso',
            'address' => 'Av. Manoel Ribas, 3850 - Bonsucesso',
            'lat' => -25.3685000, 'lng' => -51.4632000,
        ],
        [
            'name' => 'Bairro São Cristóvão Residencial',
            'address' => 'Rua Judite Bastos de Oliveira, 150 - São Cristóvão',
            'lat' => -25.3650000, 'lng' => -51.4580000,
        ],

        // Polo Centro / Batel / Trianon
        [
            'name' => 'McDonald\'s Centro',
            'address' => 'Rua Vicente Machado, 1400 - Centro',
            'lat' => -25.3942000, 'lng' => -51.4635000,
        ],
        [
            'name' => 'Chiquinho Sorvetes Lagoa',
            'address' => 'Rua Saldanha Marinho, 1150 - Centro',
            'lat' => -25.3912000, 'lng' => -51.4615000,
        ],
        [
            'name' => 'Farmácia São João XV de Novembro',
            'address' => 'Rua XV de Novembro, 7200 - Centro',
            'lat' => -25.3930000, 'lng' => -51.4640000,
        ],
        [
            'name' => 'Padaria Central Guarapuava',
            'address' => 'Rua Saldanha Marinho, 1200 - Centro',
            'lat' => -25.3905000, 'lng' => -51.4628000,
        ],
        [
            'name' => 'Praça 9 de Dezembro',
            'address' => 'Rua XV de Novembro, s/n - Centro',
            'lat' => -25.3954100, 'lng' => -51.4641200,
        ],
        [
            'name' => 'Lagoa das Lágrimas',
            'address' => 'Rua Brigadeiro Rocha, s/n - Centro',
            'lat' => -25.3925000, 'lng' => -51.4625000,
        ],
        [
            'name' => 'Parque do Lago',
            'address' => 'Rua Salvatore Renna, s/n - Batel',
            'lat' => -25.4010500, 'lng' => -51.4670200,
        ],
        [
            'name' => 'Batel Imóveis & Residências',
            'address' => 'Rua Capitão Rocha, 890 - Batel',
            'lat' => -25.3995000, 'lng' => -51.4715000,
        ],
        [
            'name' => 'Bairro Trianon Residencial',
            'address' => 'Rua Visconde de Guarapuava, 420 - Trianon',
            'lat' => -25.3910000, 'lng' => -51.4700000,
        ],
        [
            'name' => 'Prefeitura Municipal de Guarapuava',
            'address' => 'Rua Brigadeiro Rocha, 2777 - Centro',
            'lat' => -25.3948000, 'lng' => -51.4632000,
        ],

        // Polo Oeste / Santa Cruz / Campo Real
        [
            'name' => 'UNICENTRO - Câmpus Santa Cruz',
            'address' => 'Rua Padre Salvador, 875 - Santa Cruz',
            'lat' => -25.3896597, 'lng' => -51.4769122,
        ],
        [
            'name' => 'Centro Universitário Campo Real',
            'address' => 'Rua Comendador Norberto, 1299 - Santa Cruz',
            'lat' => -25.3871200, 'lng' => -51.4721500,
        ],
        [
            'name' => 'Supermercado Baratão Santa Cruz',
            'address' => 'Rua Saldanha Marinho, 3100 - Santa Cruz',
            'lat' => -25.3880000, 'lng' => -51.4740000,
        ],
        [
            'name' => 'Bairro Morro Alto Comercial',
            'address' => 'Av. Moacir Júlio Silvestri, 3200 - Morro Alto',
            'lat' => -25.3750000, 'lng' => -51.4880000,
        ],

        // Polo Sul / Vila Carli / CEDETEG / Santana
        [
            'name' => 'UNICENTRO - Câmpus CEDETEG',
            'address' => 'Alameda Élio Antonio Dalla Vecchia, 838 - Vila Carli',
            'lat' => -25.4050200, 'lng' => -51.4420300,
        ],
        [
            'name' => 'Hipermercado Dal Pozzo Vila Carli',
            'address' => 'Av. Moacir Júlio Silvestri, 1450 - Vila Carli',
            'lat' => -25.4050000, 'lng' => -51.4550000,
        ],
        [
            'name' => 'Terminal Rodoviário de Guarapuava',
            'address' => 'Av. Sebastião de Camargo Ribas, 2100 - Bonsucesso',
            'lat' => -25.3912300, 'lng' => -51.4550100,
        ],
        [
            'name' => 'Bairro Santana Residencial',
            'address' => 'Rua Rosa Lustosa de Siqueira, 780 - Santana',
            'lat' => -25.3830000, 'lng' => -51.4520000,
        ],
        [
            'name' => 'Bairro Primavera Sul',
            'address' => 'Rua das Camélias, 410 - Primavera',
            'lat' => -25.4200000, 'lng' => -51.4750000,
        ],
        [
            'name' => 'Vila Bela Residencial',
            'address' => 'Rua Pato Branco, 250 - Vila Bela',
            'lat' => -25.4150000, 'lng' => -51.4650000,
        ],
    ];

    /**
     * Descrições típicas de pacotes por categoria
     */
    protected array $packageDescriptions = [
        // Expressos rápidos (lanches, remédios, doces, conveniência)
        'express' => [
            'Combo Big Mac Duplo + Batata Frita Grande + Bebida',
            'Milk Shake Chiquinho 500ml + Barca de Açaí Especial',
            'Medicamentos e Antitérmicos de Urgência',
            'Pães Franceses Quentes, Frios e Café Especial',
            'Chave Reserva e Documentos de Escritório',
            'Açaí Especial na Tigela 700ml com Frutas',
            'Medicamentos de Receita Controlada + Curativos',
            'Lanche Artesanal Cheddar Bacon + Batata Rústica',
            'Bolo Caseiro de Cenoura com Chocolate e Salgados',
            'Peça de Reposição Automotiva para Oficina Mecânica',
            'Carregador de Notebook Original e Mouse Gamer',
            'Kit Sushi Combinado Premium 30 Peças',
            'Flores e Cesta de Presentes de Aniversário',
            'Sobremesa de Gelato Italiano e Waffle',
            'Remédios Pediátricos e Inalador Nebulizador',
            'Contrato Jurídico Urgente com Firma Reconhecida',
            'Copo Stanley Térmico e Garrafa Esportiva',
            'Suplemento Whey Protein Isolado e Creatina',
            'Doces Gourmet, Trufas e Pão de Mel Artesanal',
            'Peça de Eletrônica e Placa de Circuito Impresso',
        ],

        // Econômicos (compras de mercado, materiais de estudo, vestuário, livros)
        'economic' => [
            'Cesta de Compras do Mês (Mercearia, Grãos e Óleo)',
            'Kit de Apostilas e Livros Acadêmicos Universitários',
            'Roupas e Calçados Adquiridos em Promoção do Shopping',
            'Material de Escritório, Papel A4 e Cartuchos de Tinta',
            'Ração Premium para Cães e Gatos (Saco 10kg)',
            'Itens de Higiene Pessoal e Cosméticos de Farmácia',
            'Cafeteira Elétrica e Sanduicheira Doméstica',
            'Caixa de Ferramentas e Kit de Brocas para Furadeira',
            'Cesta de Frutas e Verduras Orgânicas da Semana',
            'Conjunto de Lençóis e Toalhas de Banho Algodão',
            'Pacote com 5 Livros Clássicos de Literatura Brasileira',
            'Kit de Tintas e Pincéis para Trabalho Acadêmico',
            'Fardo de Água Mineral e Bebidas Isotônicas',
            'Calçados Esportivos e Roupas para Ginástica',
            'Produtos de Limpeza Doméstica Concentrados',
            'Peças de Decoração e Almofadas para Sala',
            'Teclado Mecânico Ergonômico e Fone de Ouvido',
            'Suprimentos para Laboratório Didático de Química',
            'Artigos de Papelaria Universitária e Cadernos',
            'Peças de Vestuário Masculino e Camisetas Básicas',
            'Acessórios para Petshop (Caminha e Brinquedos)',
            'Utensílios de Cozinha Inox e Jogo de Pratos',
            'Materiais de Construção Leves (Lâmpadas LED e Fitas)',
            'Conjunto de Tapetes Antiderrapantes para Casa',
            'Aparelho de Jantar Cerâmica com 12 Peças',
        ],
    ];

    /**
     * Execute the console command.
     */
    public function handle(OsrmRoutingService $routingService, FreightCalculatorService $freightCalculator): int
    {
        $expressCount = (int) $this->option('express');
        $economicCount = (int) $this->option('economic');
        $clean = (bool) $this->option('clean');

        $this->info("🚀 Iniciando geração de dados mockados para Guarapuava...");
        $this->line("• Pedidos Expressos: {$expressCount}");
        $this->line("• Pedidos Econômicos: {$economicCount}");

        // 1. Assegura que haja pelo menos 1 Lojista cadastrado no banco
        $clients = Client::all();
        if ($clients->isEmpty()) {
            $user = User::firstOrCreate(
                ['email' => 'lojista@zarpa.com.br'],
                [
                    'name' => 'Lojista Principal Guarapuava',
                    'password' => bcrypt('lojista123456'),
                    'role' => 'client',
                    'phone' => '(42) 99999-1111',
                ]
            );

            $client = Client::create([
                'user_id' => $user->id,
                'business_name' => 'Zarpa Lojistas Hub Centro',
                'cnpj_cpf' => '00.123.456/0001-99',
                'default_address' => 'Rua Saldanha Marinho, 1200 - Centro, Guarapuava - PR',
                'default_lat' => -25.3905,
                'default_lng' => -51.4628,
            ]);
            $clients = collect([$client]);
        }

        // 2. Limpeza prévia se solicitada
        if ($clean) {
            $this->warn("🧹 Removendo pedidos mockados anteriores (POPULATE: e MOCK:)...");
            Order::where('package_description', 'like', 'POPULATE:%')
                ->orWhere('package_description', 'like', 'MOCK:%')
                ->delete();
            DeliveryGroup::whereDoesntHave('orders')->delete();
        }

        $placesCount = count($this->guarapuavaPlaces);
        $ordersCreated = 0;

        // 3. Gerar Pedidos Expressos (20 por padrão)
        $this->info("⚡ Gerando {$expressCount} pedidos Expressos...");
        $barExpress = $this->output->createProgressBar($expressCount);
        $barExpress->start();

        for ($i = 1; $i <= $expressCount; $i++) {
            $originIdx = array_rand($this->guarapuavaPlaces);
            do {
                $destIdx = array_rand($this->guarapuavaPlaces);
            } while ($destIdx === $originIdx);

            $origin = $this->guarapuavaPlaces[$originIdx];
            $dest = $this->guarapuavaPlaces[$destIdx];

            // Peso típico express: 0.3kg a 4.5kg
            $weight = round(mt_rand(3, 45) / 10, 2);
            $descItem = $this->packageDescriptions['express'][$i % count($this->packageDescriptions['express'])];
            $packageDesc = "MOCK: [⚡ Expresso #{$i}] {$descItem}";

            $route = $routingService->calculateRoute(
                (float) $origin['lat'],
                (float) $origin['lng'],
                (float) $dest['lat'],
                (float) $dest['lng']
            );

            $pricing = $freightCalculator->calculate($route['distance_km'], $weight, 'express');
            $client = $clients->random();

            Order::create([
                'client_id' => $client->id,
                'package_description' => $packageDesc,
                'package_weight_kg' => $weight,
                'package_volume_m3' => 0.0050,
                'shipping_type' => 'express',
                'status' => 'pending',
                'is_anchor' => false,
                'individual_freight_price' => $pricing['individual_price'],
                'final_freight_price' => null,
                'distance_km' => $route['distance_km'],
                'estimated_duration_minutes' => $route['duration_minutes'],
                'route_geometry' => $route['polyline_geometry'] ?? null,
                'origin_address' => "{$origin['name']} - {$origin['address']}",
                'dest_address' => "{$dest['name']} - {$dest['address']}",
                'origin_lat' => $origin['lat'],
                'origin_lng' => $origin['lng'],
                'dest_lat' => $dest['lat'],
                'dest_lng' => $dest['lng'],
            ]);

            $ordersCreated++;
            $barExpress->advance();
        }
        $barExpress->finish();
        $this->newLine();

        // 4. Gerar Pedidos Econômicos (50 por padrão)
        $this->info("📦 Gerando {$economicCount} pedidos Econômicos...");
        $barEco = $this->output->createProgressBar($economicCount);
        $barEco->start();

        for ($j = 1; $j <= $economicCount; $j++) {
            $originIdx = array_rand($this->guarapuavaPlaces);
            do {
                $destIdx = array_rand($this->guarapuavaPlaces);
            } while ($destIdx === $originIdx);

            $origin = $this->guarapuavaPlaces[$originIdx];
            $dest = $this->guarapuavaPlaces[$destIdx];

            // Peso econômico: 0.8kg a 12.0kg
            $weight = round(mt_rand(8, 120) / 10, 2);
            $descItem = $this->packageDescriptions['economic'][$j % count($this->packageDescriptions['economic'])];
            $packageDesc = "MOCK: [📦 Econômico #{$j}] {$descItem}";

            $route = $routingService->calculateRoute(
                (float) $origin['lat'],
                (float) $origin['lng'],
                (float) $dest['lat'],
                (float) $dest['lng']
            );

            $pricing = $freightCalculator->calculate($route['distance_km'], $weight, 'economic');
            $client = $clients->random();

            Order::create([
                'client_id' => $client->id,
                'package_description' => $packageDesc,
                'package_weight_kg' => $weight,
                'package_volume_m3' => 0.0180,
                'shipping_type' => 'economic',
                'status' => 'pending',
                'is_anchor' => ($j % 5 === 0), // Cada 5º pedido é âncora geográfica
                'individual_freight_price' => $pricing['individual_price'],
                'final_freight_price' => null,
                'distance_km' => $route['distance_km'],
                'estimated_duration_minutes' => $route['duration_minutes'],
                'route_geometry' => $route['polyline_geometry'] ?? null,
                'origin_address' => "{$origin['name']} - {$origin['address']}",
                'dest_address' => "{$dest['name']} - {$dest['address']}",
                'origin_lat' => $origin['lat'],
                'origin_lng' => $origin['lng'],
                'dest_lat' => $dest['lat'],
                'dest_lng' => $dest['lng'],
            ]);

            $ordersCreated++;
            $barEco->advance();
        }
        $barEco->finish();
        $this->newLine();

        $this->info("✨ Sucesso! Total de {$ordersCreated} novos pedidos cadastrados aleatoriamente.");
        $this->line("• Distribuídos por toda Guarapuava (UTFPR, UNICENTRO, Centrais, Shopping, Morro Alto, Vila Carli).");
        $this->line("• Pedidos prontos para serem aceitos no Radar Expresso e para simulação do Batch Econômico.");

        return Command::SUCCESS;
    }
}
