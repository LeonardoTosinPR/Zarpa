# 🚀 ZARPA - Plataforma Inteligente de Intermediação de Entregas Urbanas

> **TCC 2** - Tecnologia em Sistemas para Internet | **Universidade Tecnológica Federal do Paraná (UTFPR) – Câmpus Guarapuava**  
> **Autor**: Leonardo Tosin | **Orientador**: Prof. Dr. Andres Jessé Porfirio  
> **Período de Execução**: 25/08/2026 a 31/10/2026  
> **Figma UI/UX**: [Protótipo no Figma (zarpa-entregas)](https://www.figma.com/design/TIzcx26iKkfJtdGsidStqD/zarpa-entregas?node-id=4-2&p=f)  
> **Status do Repositório**: 🏁 **Sprint 7 Concluída e MVP Homologado** (`sprint/7-validacao-cenarios-reais-homologacao`)

---

## 📚 Módulos e Documentações do Projeto

Navegue diretamente pelos módulos de engenharia e especificações do monorepo:

| Módulo / Documento | Descrição do Componente | Link de Acesso |
| :--- | :--- | :--- |
| 🐘 **Backend (API)** | API RESTful em Laravel 13, PostgreSQL 16 + PostGIS, Sanctum, OSRM próprio e Pest v3 | 👉 [**Acessar README Backend**](backend/README.md) |
| 📱 **Mobile (App)** | App React Native com Expo SDK 54, Expo Router, Leaflet/OSM, Design System e Jest | 👉 [**Acessar README Mobile**](mobile/README.md) |
| 📐 **Arquitetura** | Arquitetura em camadas, diagramas de sequência, segurança e DER Geoespacial | 👉 [**Acessar ARQUITETURA.md**](docs/ARQUITETURA.md) |
| 📅 **Plano de Sprints** | Cronograma consolidado, matriz MoSCoW/RICE e planejamento detalhado (TCC 2) | 👉 [**Acessar PLANO_SPRINTS_TCC2_ZARPA.md**](docs/PLANO_SPRINTS_TCC2_ZARPA.md) |
| 🏆 **Relatório de Homologação Final** | Auditoria empírica de 43 lotes, 156 pedidos e conformidade de requisitos do MVP | 👉 [**Acessar Relatório de Homologação Final**](docs/relatorios/homologacao_final_mvp_tcc2.md) |

### 🏁 Histórico e Detalhamento das Sprints

| Sprint | Tema Central da Sprint | Documento de Especificação |
| :--- | :--- | :--- |
| 🏆 **Sprint 7 (Final / Homologada)** | Validação em Cenários Reais de Guarapuava, Regressão E2E e Homologação Final do MVP | 👉 [**docs/sprints/sprint_7.md**](docs/sprints/sprint_7.md) |
| 🗺️ **Sprint 6** | Execução Operacional de Rotas, Comprovante por Código (6 dígitos) ou Foto, Bônus Unificado e GPS Externo | 👉 [**docs/sprints/sprint_6.md**](docs/sprints/sprint_6.md) |
| 💰 **Sprint 5** | Motor de Rateio Dinâmico 50/50, Extratos Financeiros, Taxa de Parada e Interpolação Métrica Predial | 👉 [**docs/sprints/sprint_5.md**](docs/sprints/sprint_5.md) |
| 📦 **Sprint 4** | Lotes Econômicos, Agrupamento Espacial Assíncrono (PostGIS) e Sequenciamento PDP OSRM | 👉 [**docs/sprints/sprint_4.md**](docs/sprints/sprint_4.md) |
| ⚡ **Sprint 3** | Fluxo Expresso, Radar de Proximidade, Bloqueio Pessimista (`lockForUpdate`) e Telemetria GPS | 👉 [**docs/sprints/sprint_3.md**](docs/sprints/sprint_3.md) |
| 🗺️ **Sprint 2** | Postagem de Pedidos, Geocodificação OSRM e Mapa Interativo | 👉 [**docs/sprints/sprint_2.md**](docs/sprints/sprint_2.md) |
| 👤 **Sprint 1** | Autenticação, Perfis de Atores (Lojista / Entregador) e Navegação Condicional Segura | 👉 [**docs/sprints/sprint_1.md**](docs/sprints/sprint_1.md) |
| ⚙️ **Sprint 0** | Setup de Monorepo, Infraestrutura Docker (PostGIS) e Pipelines de CI/CD | 👉 [**docs/sprints/sprint_0.md**](docs/sprints/sprint_0.md) |

---

## 📌 Visão Geral do Sistema

O **Zarpa** é uma plataforma que transforma a logística de entregas de última milha (*last-mile*) em Guarapuava (PR). Ao substituir intermediários predatórios por uma arquitetura geoespacial colaborativa, o sistema integra uma API RESTful em **Laravel 13 (PHP 8.3+)** com **PostgreSQL 16 / PostGIS** e um aplicativo móvel em **React Native / Expo SDK 54**:

### 1. ⚡ Entrega Expressa (On-Demand)
- **Despacho Imediato**: Notificação de novos chamados via Radar Espacial baseado em raio de proximidade configurável (1 a 50 km).
- **Controle Transacional Pessimista**: Disputa concorrente entre entregadores com `lockForUpdate()` no banco de dados, prevenindo condições de corrida (*race conditions*) e retornando `HTTP 409 Conflict` amigável aos demais condutores.
- **Navegação GPS Externa e Telemetria em Tempo Real**: Transbordamento direto em 1 toque para Google Maps ou Waze na entrega expressa ativa (`active-delivery.tsx`), sincronização de coordenadas e persistência de rejeições explícitas (`OrderRejection`).

### 2. 📦 Lote Econômico com Roteamento PDP & Navegação Unificada
- **Agrupamento Noturno Automatizado e Manual (Admin)**: Algoritmo espacial (`BatchClusteringService`) em PostGIS (`ST_DWithin`) que consolida pedidos compatíveis em rotas únicas contínuas, acionável também sob demanda no Painel Administrativo Master (`POST /api/batch/process-economic`).
- **Roteamento Viário Real OSRM & Rota Única no GPS**: Integração com servidor dedicado OSRM (`https://osrmcar.debug.app.br`) para sequenciamento otimizado de coletas e entregas e exportação de rota completa com *waypoints* (`openMultiStopNavigation`) para o navegador GPS externo.

### 3. 💰 Motor de Rateio Dinâmico 50/50 & Bônus Unificado ao Entregador
- **Divisão Cooperativa da Economia Viária**: A quilometragem total em lote ($D_{conjunta}$) é sensivelmente menor que o somatório das corridas individuais isoladas ($D_{isolada}$). A economia financeira bruta ($\Delta D \times R\$\,2{,}50/\text{km}$) é dividida deterministicamente:
  - **50% repassado como Bônus de Produtividade ao Entregador**.
  - **50% devolvido como Desconto Retroativo Proporcional aos Lojistas** participantes do lote.
- **Conservação Contábil Estrita**: Algoritmo com compensação automática de resíduos decimais, garantindo 100% de precisão nos centavos.
- **Bônus Unificado na Visão do Entregador (Taxa de Parada R$ 3,00 + Rateio 50%)**: Consolidação transparente da bonificação por parada concluída com o rateio de eficiência em um único indicador de **Bônus** nas telas de Lotes e Agenda, elevando a remuneração média auditada nos 40 lotes da base para **R$ 4,27/km** (**78,9%** de repasse líquido ao parceiro e **21,1%** de margem retida pela plataforma).

### 4. 🔐 Comprovante Obrigatório de Entrega (Código de 6 Dígitos ou Foto)
- **Validação Anti-Fraude**: Ao ser aceito (Expresso) ou agrupado em lote (Econômico), cada pedido recebe automaticamente um `delivery_code` exclusivo de 6 dígitos visível ao lojista.
- **Sigilo Operacional**: A API oculta dinamicamente o `delivery_code` nas respostas enviadas ao entregador (`courier`), exigindo que o condutor digite o código de 6 dígitos informado no ato da entrega ou anexe foto comprobatória (`proof_photo_url`) para concluir o pedido (`delivered`).

### 5. 📍 Geocodificação com Interpolação Métrica Predial
- **Precisão em Vias Extensas**: Algoritmo inteligente (`GeocodingService` + dicionário local em `backend/app/Services/GeocodingService.php`) que soluciona o problema de endereços longos (ex: Rua Saldanha Marinho, 40) interpolando a projeção métrica da via em relação à geometria viária real, superando imprecisões de centróides de logradouro de bases públicas.

### 6. 📊 Extratos Financeiros Transparentes & Painel Admin Master
- **Painel do Lojista (`(client)/financial.tsx`)**: Card hero de economia acumulada, comparativo riscado (preço original vs preço final com rateio) e histórico de entregas.
- **Painel do Entregador (`(courier)/financial.tsx`)**: Faturamento bruto consolidado, ganhos base, bônus de produtividade por lote, taxa de parada e métrica de rendimento ($R\$/km$).
- **Painel Administrativo Master (`admin.tsx`)**: Monitoramento em tempo real de KPIs, disparo manual do Lote Econômico Noturno, gestão de usuários e auditoria de pedidos/comprovantes.

### 7. 🗺️ Mapas Livres com Expo-Leaflet e OpenStreetMap
- **Zero Custos de API**: Substituição total de bibliotecas pagas do Google Maps pelo componente customizado `MyMap` (`expo-leaflet` + `react-native-webview`), consumindo azulejos livres do OpenStreetMap (OSM) com projeção Mercator e marcadores temáticos.

---

## 📂 Estrutura do Monorepo

```
/ (raiz do repositório)
├── .github/workflows/ci.yml   # Pipelines de CI/CD (Pest, Jest, TypeScript, Lint)
├── .maestro/                  # Suíte de Testes End-to-End (E2E) em YAML
│   ├── healthcheck.yaml
│   ├── auth_flow.yaml
│   ├── create_order_flow.yaml
│   ├── express_accept_flow.yaml
│   ├── financial_statement_flow.yaml
│   └── delivery_execution_flow.yaml
├── backend/                   # API RESTful em Laravel 13 (PHP 8.3+) + PostGIS + Sanctum
│   ├── app/
│   │   ├── Http/Controllers/Api/   # Auth, Orders, ExpressDispatch, DeliveryGroup, Financial
│   │   ├── Services/               # DynamicApportionment, BatchClustering, CourierDispatch, Geocoding
│   │   └── Models/                 # User, Order, DeliveryGroup, GroupOrder, OrderRejection
│   ├── database/migrations/        # Schema relacional e espacial (PostGIS SRID 4326)
│   ├── database/seeders/           # Seeders de usuários e lotes econômicos simulados
│   └── tests/                      # 65 testes automatizados em Pest v3 (574 asserções)
├── mobile/                    # App Mobile React Native com Expo SDK 54 (Expo Router)
│   ├── app/
│   │   ├── admin.tsx          # Painel Administrativo Master e execução manual do Lote Noturno
│   │   ├── (client)/          # Rotas do Lojista (dashboard, create-order, orders, financial, profile)
│   │   └── (courier)/         # Rotas do Entregador (dashboard, express-radar, economic-batches, route-agenda, active-delivery, financial, profile)
│   ├── src/
│   │   ├── components/        # MyMap (Leaflet/OSM), Header, Input, RoleSelector, RouteMapPreview
│   │   ├── services/          # api, orderService, courierService, financialService, adminService
│   │   └── context/           # AuthContext (autenticação persistente com expo-secure-store)
│   └── __tests__/             # 15 suítes de testes unitários e de componentes com Jest (52 testes)
├── docs/                      # Documentação viva de engenharia de software
│   ├── MASTER_PLAN.md         # Visão executiva e matriz MoSCoW/RICE
│   ├── PLANO_SPRINTS_TCC2_ZARPA.md # Cronograma mestre de sprints
│   ├── ARQUITETURA.md         # Diagramas de arquitetura, fluxo de dados e DER PostGIS
│   ├── relatorios/            # Relatórios analíticos e financeiros consolidados (Pós-Sprint 5 e 6)
│   └── sprints/               # Documentação detalhada das Sprints 0 a 6
├── run.ps1 / run.sh           # ⚡ CLI Unificado de Gerenciamento do Projeto
├── docker-compose.yml         # Orquestração PostgreSQL 16 + PostGIS e Backend Laravel
└── README.md
```

---

## ⚡ CLI Unificado de Gerenciamento (`run.ps1` / `run.sh`)

O projeto dispõe de scripts utilitários multiplataforma para inicializar ambientes, rodar testes e gerenciar bancos de dados:

| Comando PowerShell | Comando Bash / Linux | Ação Executada |
| :--- | :--- | :--- |
| `.\run.ps1 dev` | `./run.sh dev` | Sobe Docker (PostGIS + Backend) e inicia o Expo Mobile |
| `.\run.ps1 up` | `./run.sh up` | Sobe containers Docker em segundo plano (`-d`) |
| `.\run.ps1 down` | `./run.sh down` | Para e remove containers Docker |
| `.\run.ps1 restart` | `./run.sh restart` | Reinicia containers Docker |
| `.\run.ps1 mobile` | `./run.sh mobile` | Inicia o servidor de desenvolvimento Expo |
| `.\run.ps1 db:populate` | `./run.sh db:populate` | Executa migrations e popula cenários e lotes de teste |
| `.\run.ps1 db:reset` | `./run.sh db:reset` | Reseta o banco (`migrate:fresh`) e repopula a base |
| `.\run.ps1 test` | `./run.sh test` | Executa a suíte completa de testes (Pest + Jest + TypeScript) |
| `.\run.ps1 test:backend` | `./run.sh test:backend`| Executa os testes do backend Laravel (Pest v3) |
| `.\run.ps1 test:mobile` | `./run.sh test:mobile` | Executa os testes unitários do mobile (Jest) |
| `.\run.ps1 test:e2e` | `./run.sh test:e2e` | Executa fluxos End-to-End com Maestro |
| `.\run.ps1 diagnostic` | `./run.sh diagnostic` | Diagnóstico de integridade do ambiente |
| `.\run.ps1 users` | `./run.sh users` | Exibe as credenciais de teste pré-configuradas |
| `.\run.ps1 help` | `./run.sh help` | Menu interativo de comandos |

---

## 🧪 Métricas de Qualidade & Cobertura de Testes

O repositório mantém verificação rigorosa e contínua em cada sprint:

- **Backend (Pest v3)**: **65 testes aprovados (574 asserções)** cobrindo:
  - Casos matemáticos de rateio (`DynamicApportionmentServiceTest`).
  - Clusterização espacial e despacho (`BatchClusteringServiceTest`, `CourierDispatchServiceTest`).
  - Bloqueio concorrente pessimista e disputas simultâneas de radar (`ExpressDispatchTest`).
  - Endpoints de extrato e integridade contábil (`FinancialStatementTest`).
  - Execução operacional de rotas sequenciadas, transições de status e validação obrigatória de comprovante por código de 6 dígitos ou foto (`RouteExecutionTest`).
  - Rastreamento em tempo real e timeline vertical de entrega para o lojista (`OrderTrackingTest`).
- **Mobile (Jest + RNTL)**: **15 suítes aprovadas, 52 testes unitários/componente** cobrindo:
  - Agenda operacional de tarefas sequenciadas do condutor, rota GPS unificada e comprovante por código/foto (`RouteAgenda.test.tsx`).
  - Rastreamento em tempo real com modal, código de entrega de 6 dígitos e timeline do lojista (`OrderTracking.test.tsx`).
  - Telas de extrato financeiro do lojista e condutor (`FinancialStatement.test.tsx`).
  - Radar expresso e disputa concorrente (`ExpressRadar.test.tsx`).
  - Lotes econômicos com bônus unificado e entregas expressas ativas com GPS externo (`EconomicBatch.test.tsx`, `ActiveDelivery.test.tsx`).
  - Mapas com Leaflet/OSM e polylines (`MyMap.test.tsx`, `Polyline.test.ts`).
  - Painel administrativo com disparo manual do lote noturno e autenticação (`AdminPanel.test.tsx`, `AuthScreens.test.tsx`).
- **TypeScript**: **0 erros** de compilação estática (`npx tsc --noEmit`).
- **CI/CD Integrado**: GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) executando validação completa em todos os commits e pull requests.

---

## 🔑 Usuários e Credenciais de Teste Pré-Configurados

As contas de teste são geradas automaticamente pelo comando `./run.sh db:populate`:

| Perfil | E-mail | Senha | Detalhes no Sistema |
| :--- | :--- | :--- | :--- |
| 👑 **Admin Master** | `admin@zarpa.com.br` | `admin123456` | Acesso total à gestão de ordens, disparo manual de lotes noturnos e alternância de perfis |
| 🏪 **Lojista Teste** | `lojista@zarpa.com.br` | `lojista123456` | *Padaria Central Guarapuava* (CNPJ `12.345.678/0001-90`) |
| 🛵 **Entregador Teste** | `entregador@zarpa.com.br` | `entregador123456` | *Carlos Motoboy* (Moto Honda CG 160, Placa `BRA2E19`) |

> 💡 **Acesso ao Painel Administrativo**: Ao autenticar com a conta **Admin Master** (`admin@zarpa.com.br`), você pode acessar o **Painel Administrativo Master** diretamente pelo card em destaque no Dashboard inicial ou na tela de Perfil para disparar manualmente o processamento de lotes econômicos noturnos e auditar usuários, pedidos e códigos de entrega.
