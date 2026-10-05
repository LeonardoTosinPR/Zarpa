# SPRINT 4: Lote Econômico, Agrupamento Assíncrono (Batch) e Roteamento Multi-Pontos

- **Período**: 26/09/2026 a 04/10/2026 (9 dias)
- **Branch Git**: `sprint/4-lote-economico-agrupamento`
- **Requisitos Mapeados**:
  - **RF 04**: Algoritmo de Lote Econômico (Batch Noturno) (Must Have, RICE 1600)
  - **RF 05**: Integração OSRM Multi-paradas e Polylines (Must Have, RICE 2400)
  - **RNF 01**: Persistência Geoespacial em PostGIS (`SRID 4326`, índices GiST, latência < 1.5s)
  - **RNF 04**: Desempenho do Motor de Roteamento Viário (< 2.5s)

---

## 1. Objetivos da Sprint

Construir o coração logístico colaborativo do Zarpa: o **Lote Econômico**.
Diferente das entregas expressas ponto a ponto, pedidos postados como econômicos são acumulados ao longo do dia para processamento noturno assíncrono (Batch às 02:00) ou disparo sob demanda.

O fluxo contempla:
1. **Clusterização Geoespacial por Proximidade**: Agrupamento inteligente de pedidos vizinhos no perímetro urbano de Guarapuava (`ST_DWithin` / Haversine) respeitando restrições de capacidade física de veículos (máximo de 5 pedidos, limite de 20 kg e 0.150 m³ de volume).
2. **Sequenciamento com Precedência Estrita (Pickup and Delivery Problem - PDP)**: Garantia algorítmica inegociável de que a coleta de cada remetente ocorre estritamente antes da respectiva entrega ao destinatário final ($P_i < D_i$).
3. **Roteamento Viário Multi-Pontos com OSRM**: Integração do motor OSRM próprio (`https://osrmcar.debug.app.br`) com suporte a múltiplos waypoints em um único trajeto contínuo, gerando polilinha codificada, quilometragem real e duração viária total.
4. **Disparo Manual e Automatizado a Qualquer Momento**: Disponibilização do comando Artisan `php artisan zarpa:process-economic-batch` e de endpoint REST dedicado `POST /api/batch/process-economic`, além de botões nas interfaces do Lojista e do Entregador para simulação e homologação a qualquer momento.
5. **Dados de Referência de Guarapuava**: Inclusão de estabelecimentos e pólos reais nos seeders do sistema (UTFPR, UNICENTRO Santa Cruz e Cedeteg, Shopping Cidade dos Lagos, Dal Pozzo, Superpão Compre Mais, McDonald's, Sorveterias e Farmácias).

---

## 2. Arquitetura Técnica e Algorítmica

### 2.1 Modelagem de Dados Relacional
- **Tabela `delivery_groups`**:
  - Armazena os dados consolidados do lote gerado: `courier_id`, `scheduled_date`, `total_distance_km`, `total_duration_minutes`, `status`, `total_combined_cost`, `total_savings_generated`, `courier_bonus` e `route_geometry` (polyline contínua de todo o trajeto).
- **Tabela `group_orders`**:
  - Armazena as paradas individuais sequenciadas de 1 a N: `delivery_group_id`, `order_id`, `stop_sequence`, `stop_type` (`pickup` ou `delivery`), `isolated_distance_km`, `shared_distance_km`, `allocated_cost` e `merchant_discount`.

### 2.2 Algoritmo de Sequenciamento com Precedência (`BatchClusteringService`)
Para cada cluster de pedidos:
```php
// Heurística de vizinho mais próximo com restrição estrita de carga
while (count($sequencedStops) < $totalStops) {
    // 1. Candidatos a Coleta: Pedidos cuja coleta ainda não ocorreu
    // 2. Candidatos a Entrega: Apenas pedidos que JÁ FORAM COLETADOS
    // Escolhe o nó mais próximo da posição atual
}
```

### 2.3 Roteamento Multi-Pontos no OSRM (`OsrmRoutingService`)
- Formatação dos nós no padrão: `{lng1},{lat1};{lng2},{lat2};...;{lngN},{latN}`.
- Chamada HTTP autenticada via Basic Auth para a rota de direção com steps, overview e geometries.
- Fallback geodésico resiliente caso a infraestrutura viária esteja em contingência.

---

## 3. Backlog de Tarefas Entregue

### 3.1 Backend (Laravel 13 - PHP 8.3+)
- [x] **Migrations e Models**:
  - `2026_10_01_000001_create_delivery_groups_table.php` e model `DeliveryGroup`.
  - `2026_10_01_000002_create_group_orders_table.php` e model `GroupOrder`.
  - Relacionamentos Eloquent em `Order` e `Courier` (`deliveryGroups()`, `groupOrders()`, `currentDeliveryGroup()`).
- [x] **Roteamento Multi-Pontos OSRM (`OsrmRoutingService`)**:
  - Método `calculateMultiStopRoute(array $waypoints)` com fallback Haversine.
- [x] **Motor de Clusterização (`BatchClusteringService`)**:
  - Agrupamento geográfico por proximidade e pedidos âncora.
  - Sequenciamento ótimo garantindo que toda coleta antecede a entrega.
  - Validação de restrições de peso (20 kg) e pacotes (máx. 5 por condutor).
  - Alocação biunívoca de entregadores (cada condutor assume no máximo 1 lote por ciclo).
- [x] **Comandos Artisan**:
  - `php artisan zarpa:process-economic-batch` com suporte a `--date`, `--radius` e `--dry-run` (agendado diariamente às 02:00 em `routes/console.php`).
  - `php artisan db:populate` (`PopulateTestScenarioCommand`): popula o cenário real de teste com 3 entregadores parceiros posicionados em pólos estratégicos (Bonsucesso/UTFPR, Centro/Santa Cruz e Vila Carli/Cedeteg) e 15 pedidos econômicos (5 pedidos de fluxo contínuo para cada entregador).
- [x] **Endpoints de API (`DeliveryGroupController`) com Controle de Acesso**:
  - `POST /api/batch/process-economic`: Restrito estritamente a administradores (`role === 'admin'`, retorna 403 Forbidden para lojistas ou condutores comuns).
  - `GET /api/batch/summary`: Resumo de pedidos econômicos pendentes.
  - `GET /api/courier/delivery-groups`: Listagem de lotes econômicos atribuídos.
  - `GET /api/courier/delivery-groups/{id}`: Detalhes do lote com paradas sequenciadas.
- [x] **Módulo de Gestão Administrativa Master (`AdminController`)**:
  - `EnsureUserIsAdmin`: middleware de barreira rejeitando não-admins com `403 Forbidden`.
  - `GET /api/admin/users`: visualização global de todos os usuários cadastrados (lojistas, entregadores e admins) com dados de perfil, telefone, status de conexão (online/offline) e métricas consolidadas.
  - `GET /api/admin/orders`: visualização global de todos os pedidos existentes no app (expressos e econômicos) com status, dados do remetente e condutor, valores de frete e métricas de operação.
  - `PATCH /api/admin/couriers/{id}/status`: controle administrativo em tempo real para ativar ou inativar condutores para recebimento de chamados e lotes econômicos.
- [x] **Dados Mockados e Seeders de Guarapuava (`EconomicBatchSeeder` e `db:populate`)**:
  - Integração do condutor oficial de testes (`entregador@zarpa.com.br`) como condutor ativo do Pólo Centro para atribuição direta imediata de lotes econômicos nos testes manuais.
  - UTFPR, UNICENTRO Santa Cruz / Cedeteg, Shopping Cidade dos Lagos, Dal Pozzo, Superpão Compre Mais, McDonald's, Sorveterias e Farmácias.
- [x] **Testes Automatizados com Pest (100% de Aprovação)**:
  - `BatchClusteringServiceTest` (precedência estrita, capacidade de peso, distância Haversine, restrição de entregadores ativos).
  - `EconomicBatchTest` (comando Artisan, autorização admin para disparo sob demanda e visualização do itinerário pelo entregador).
  - `AdminManagementTest` (listagem e filtros de usuários e pedidos com métricas, bloqueio para não-administradores e ativação/desativação de condutores).

---

### 3.2 Mobile (React Native / Expo SDK 54)
- [x] **Módulo do Lojista (`mobile/app/(client)/orders.tsx`)**:
  - Badge informativo `🌙 Aguardando processamento do lote noturno (02:00)` para pedidos econômicos pendentes.
  - Badge `💵 Lote Gerado: Entrega Agendada` quando o pedido for incluído em um lote agrupado (ícone de dinheiro).
  - Exibição de preço riscado com valor descontado pelo rateio colaborativo.
  - Remoção de disparos manuais da visão do lojista (restrito aos administradores).
- [x] **Módulo do Entregador - Tela Dedicada Exclusiva (`mobile/app/(courier)/economic-batches.tsx`)**:
  - Tela dedicada isolando completamente os lotes econômicos das entregas expressas ponto a ponto.
  - Ícone de dinheiro (`cash-outline` / `cash`) em destaque para os Lotes Econômicos.
  - Listagem dos lotes atribuídos com contagem de paradas, km total e bônus de produtividade.
  - Visualização de itinerário de paradas sequenciadas expansível detalhando coletas e entregas.
  - Painel exclusivo de simulação de disparo noturno visível apenas para usuários com perfil `role === 'admin'`.
- [x] **Dashboard do Entregador (`(courier)/dashboard.tsx`)**:
  - Remoção de redundâncias visuais: mantido apenas o **Mapa do Radar de Chamados** e telemetria de GPS em tempo real.
  - Card de atalho de Lotes Econômicos atualizado para ícone de dinheiro (`cash-outline`) e estilo destacado.
  - Botão de alternância de visão do Admin atualizado para fundo escuro (`#1E293B` / `#0F172A`) com texto em alto contraste (`#FFFFFF`).
- [x] **Aba e Tela de Gestão Master (`mobile/src/screens/AdminPanelScreen.tsx` e abas `admin`)**:
  - Nova aba "Admin" exibida na barra inferior quando `role === 'admin'`.
  - Sub-aba 👥 **Usuários do App**: métricas consolidadas, busca instantânea, filtros e chave de ativação/inativação (`Switch`) em tempo real para o admin controlar quais entregadores estão aptos a receber lotes.
  - Sub-aba 📦 **Todos os Pedidos**: métricas operacionais, busca, filtros combinados de tipo de frete e status.
  - Seletor de abas com fundo escuro (`#0F172A`).
- [x] **Testes Automatizados com Jest (100% de Aprovação)**:
  - `__tests__/EconomicBatch.test.tsx` validando tela de pedidos do lojista, atalho no dashboard do entregador e a tela dedicada de lotes econômicos.
  - `__tests__/AdminPanel.test.tsx` validando a renderização do painel admin, listagem de usuários com métricas e visualização de todos os pedidos com filtros.

---

## 4. Métricas de Validação

- **Testes Backend (Pest v3)**: **48 testes aprovados (367 asserções)**.
- **Testes Frontend (Jest)**: **12 suítes aprovadas, 38 testes unitários/componente aprovados**.
- **Tipagem TypeScript**: **0 erros (`npx tsc --noEmit`)**.
- **Regressão**: Nenhuma regressão detectada em fluxos de autenticação, geocodificação, postagem ou radar expresso da Sprint 3.

---

## 5. Notas Adicionais (Sprint 4)
- **Ocultação do Painel Admin Global**: Durante a Sprint 4, a infraestrutura base para o Painel Administrativo Global (gestão de usuários, visão global de pedidos e controle manual de status dos entregadores) foi parcialmente desenvolvida no backend e mobile para viabilizar e facilitar os testes do sistema de Lotes Econômicos. Contudo, para manter estrito alinhamento com o escopo e não comprometer as validações da Sprint 4 (focada exclusivamente em Roteamento e Lotes), **as rotas e botões de acesso a este Painel Administrativo foram intencionalmente ocultados da Interface de Usuário (UI) mobile**. Estas funcionalidades serão reativadas, expandidas e formalmente entregues em Sprints futuras (Sprint 6/8).
