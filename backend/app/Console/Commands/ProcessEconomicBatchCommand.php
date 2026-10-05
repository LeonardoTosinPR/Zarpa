<?php

namespace App\Console\Commands;

use App\Services\BatchClusteringService;
use Illuminate\Console\Command;

class ProcessEconomicBatchCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'zarpa:process-economic-batch 
                            {--date= : Data agendada para a entrega (YYYY-MM-DD)}
                            {--radius=6.0 : Raio máximo de dispersão geográfica em km}
                            {--dry-run : Apenas simular sem persistir no banco}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Processa pedidos econômicos pendentes e gera lotes agrupados com roteamento multi-pontos otimizado';

    /**
     * Execute the console command.
     */
    public function handle(BatchClusteringService $clusteringService): int
    {
        $date = $this->option('date');
        $radius = (float) $this->option('radius');
        $dryRun = (bool) $this->option('dry-run');

        $this->info("==================================================");
        $this->info(" INICIANDO PROCESSAMENTO DE LOTE ECONÔMICO (BATCH)");
        $this->info("==================================================");
        $this->line("• Data Agendada : " . ($date ?: 'Amanhã'));
        $this->line("• Raio Máximo   : {$radius} km");
        $this->line("• Modo          : " . ($dryRun ? 'SIMULAÇÃO (dry-run)' : 'PRODUÇÃO / PERSISTÊNCIA'));
        $this->newLine();

        $result = $clusteringService->processBatch($date, $radius, $dryRun);

        if (!$result['success']) {
            $this->error("Falha no processamento: " . ($result['message'] ?? 'Erro desconhecido.'));
            return Command::FAILURE;
        }

        $this->info($result['message']);
        $this->table(
            ['Métrica', 'Valor'],
            [
                ['Lotes Gerados', $result['groups_created']],
                ['Pedidos Processados', $result['orders_processed']],
                ['Economia Total Gerada', 'R$ ' . number_format($result['total_savings_generated'], 2, ',', '.')],
                ['Data Agendada', $result['date']],
            ]
        );

        if (!empty($result['groups'])) {
            $this->newLine();
            $this->info("DETALHES DOS LOTES GERADOS:");
            foreach ($result['groups'] as $idx => $group) {
                $num = $idx + 1;
                $this->line("<comment>Lote #{$num}</comment> " . (isset($group['id']) ? "[ID: {$group['id']}]" : "[Simulado]"));
                $this->line("  • Condutor Alocado : " . ($group['courier_name'] ?? 'Aguardando atribuição'));
                $this->line("  • Distância Total  : {$group['total_distance_km']} km");
                $this->line("  • Duração Estimada : {$group['total_duration_minutes']} min");
                $this->line("  • Bônus Condutor   : R$ " . number_format($group['courier_bonus'], 2, ',', '.'));
                $this->line("  • Total de Paradas : {$group['stops_count']}");

                $stopsTable = [];
                foreach ($group['stops'] as $s) {
                    $stopsTable[] = [
                        $s['type'] === 'pickup' ? 'Coleta' : 'Entrega',
                        $s['label'],
                        $s['address'],
                    ];
                }
                $this->table(['Tipo', 'Identificação', 'Endereço'], $stopsTable);
            }
        }

        return Command::SUCCESS;
    }
}
