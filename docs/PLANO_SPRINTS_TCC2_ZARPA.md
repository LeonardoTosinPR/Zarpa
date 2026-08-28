# PLANO DE SPRINTS DE DESENVOLVIMENTO (TCC 2\)

**Projeto**: ZARPA: Plataforma Inteligente para Intermediação de Entregas Urbanas com Otimização Colaborativa de Rotas e Redistribuição Dinâmica de Frete  
**Autor**: Leonardo Tosin  
**Orientador**: Prof. Dr. Andres Jessé Porfirio  
**Instituição**: Universidade Tecnológica Federal do Paraná (UTFPR) – Câmpus Guarapuava  
**Curso**: Tecnologia em Sistemas para Internet  
**Período de Execução do Desenvolvimento**: 25/08/2026 a 31/10/2026 (\~67 dias / 9,5 semanas)  
**Documento Gerado**: `PLANO_SPRINTS_TCC2_ZARPA.md` *(Documento separado e independente do TCC 1\)*

---

## 1\. Diretrizes Gerais de Engenharia e Governança

### 1.1 Arquitetura Monorepo e Estrutura de Documentação

O projeto é mantido sob uma estrutura de **Monorepo**, garantindo rastreabilidade atômica de commits, centralização da documentação viva e coerência entre as versões do backend e do aplicativo mobile:

```
/ (raiz do repositório)
├── backend/                  # API RESTful em Laravel 13 (PHP 8.3+)
│   ├── app/                  # Controllers, Models, Services, Policies, Jobs
│   ├── database/             # Migrations (PostGIS), Seeders, Factories
│   ├── routes/               # api.php
│   ├── tests/                # Testes no padrão Laravel 13 com Pest v3
│   └── composer.json
├── mobile/                   # Aplicação Móvel React Native com Expo SDK 54 (compatível com Expo Go)
│   ├── app/                  # Rotas e Telas (Expo Router)
│   ├── src/                  # Componentes, Hooks, Serviços de API, Types
│   ├── assets/               # Imagens, Ícones, Map Pins
│   ├── __tests__/            # Testes Unitários com Jest e RNTL
│   └── package.json
├── docs/                     # Documentação de Engenharia e Especificações
│   ├── MASTER_PLAN.md        # Plano Mestre e Visão Executiva do Projeto
│   ├── ARQUITETURA.md        # Especificação da Arquitetura do Sistema e Fluxos
│   └── sprints/              # Detalhamento granular de cada sprint (geradas sob demanda)
│       ├── sprint_0.md       # Especificação detalhada da Sprint 0
│       ├── sprint_1.md       # Especificação detalhada da Sprint 1
│       └── ...               # Demais sprints criadas conforme a implementação avançar
├── .maestro/                 # Suíte de Testes End-to-End (E2E) em YAML
│   ├── healthcheck.yaml
│   ├── auth_flow.yaml
│   ├── create_order_flow.yaml
│   ├── express_accept_flow.yaml
│   ├── delivery_execution_flow.yaml
│   └── financial_statement_flow.yaml
├── docker-compose.yml        # Orquestração de PostgreSQL + PostGIS e Backend
└── README.md                 # Guia de inicialização, checklist e documentação
```

> **Nota sobre a pasta `docs/`**: A pasta `docs/` centraliza os artefatos de engenharia. O arquivo `MASTER_PLAN.md` consolida a estratégia de alto nível, o documento `ARQUITETURA.md` descreve os componentes, diagramas e fluxos de dados, e a subpasta `docs/sprints/` conterá os arquivos individuais (`sprint_0.md`, `sprint_1.md`, etc.) detalhando o plano de execução e o retrospecto de cada sprint, os quais serão criados e refinados progressivamente conforme a implementação avançar.

### 1.2 Regra de Versionamento e Fluxo Git

- **Branches por Sprint**: Cada sprint deve ser desenvolvida em uma branch exclusiva criada a partir da branch principal (`main` ou `develop`).  
- **Nomenclatura Convencional de Branches**: `sprint/<numero>-<descricao-curta>` (ex: `sprint/0-setup-monorepo-infra-testes`).  
- **Padrão de Commits**: *Conventional Commits* (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).  
- **Integração Contínua**: Ao término de cada sprint, todos os testes unitários (Pest e Jest) e fluxos E2E (Maestro) devem passar antes da abertura do Pull Request (PR) e merge.

### 1.3 Matriz de Rastreabilidade de Requisitos (MoSCoW / RICE)

| ID | Tipo | Descrição Resumida | Prioridade MoSCoW | Score RICE | Sprint Responsável |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **RF 01** | Funcional | Cadastro e Autenticação de Usuários (Lojista / Entregador) | Must Have | 6000 | Sprint 1 |
| **RF 02** | Funcional | Interface de Postagem de Pedidos com Cubagem/Peso | Must Have | 1800 | Sprint 2 |
| **RF 03** | Funcional | Geocodificação de Endereços (Texto \-\> Coordenadas) | Must Have | 2700 | Sprint 2 |
| **RF 04** | Funcional | Algoritmo de Lote Econômico (Batch Noturno) | Must Have | 1600 | Sprint 4 |
| **RF 05** | Funcional | Integração ORS (Roteamento Viário e Distâncias) | Must Have | 2400 | Sprint 3 & Sprint 4 |
| **RF 06** | Funcional | Módulo de Rateio Financeiro Dinâmico (50/50) | Must Have | 1200 | Sprint 5 |
| **RF 07** | Funcional | Controle de Concorrência Transacional (Pessimistic Lock) | Must Have | 1800 | Sprint 3 |
| **RF 08** | Funcional | Painel / Agenda de Tarefas do Entregador | Must Have | 2000 | Sprint 6 |
| **RF 09** | Funcional | Atualização Manual de Status do Ciclo de Vida | Must Have | 6000 | Sprint 6 |
| **RF 10** | Funcional | Notificações Push / Radar Imediato (Expressa) | Should Have | 1067 | Sprint 3 |
| **RF 11** | Funcional | Extrato e Histórico Simplificado de Ganhos/Descontos | Should Have | 1400 | Sprint 5 |
| **RF 12** | Funcional | Transbordamento para Navegação Externa (Google Maps / Waze) | Could Have | 2000 | Sprint 6 |
| **RNF 01** | Não-Func. | Persistência Geoespacial (PostGIS, latência \< 1.5s) | Must Have | \- | Sprint 0, 2, 4 |
| **RNF 02** | Não-Func. | Segurança Transacional em Concorrência Concorrente | Must Have | \- | Sprint 3 |
| **RNF 03** | Não-Func. | Compatibilidade Multiplataforma (React Native / Expo SDK 54 \- suporte ao Expo Go) | Must Have | \- | Sprint 0, 1 a 7 |
| **RNF 04** | Não-Func. | Desempenho do Motor de Roteamento ORS (\< 2.5s) | Must Have | \- | Sprint 3, 4 |

---

## 2\. Visão Geral do Cronograma das Sprints (25/08/2026 a 31/10/2026)

| Sprint | Período | Duração | Branch Obrigatória | Foco Temático Principal |
| :---- | :---- | :---- | :---- | :---- |
| **Sprint 0** | 25/08 a 01/09/2026 | 8 dias | `sprint/0-setup-monorepo-infra-testes` | Fundação do Monorepo, Docker PostGIS, Testes (Pest/Jest/Maestro) & Checklist Emulador |
| **Sprint 1** | 02/09 a 09/09/2026 | 8 dias | `sprint/1-auth-perfis-atores` | Autenticação, Perfis de Atores e Navegação Condicional |
| **Sprint 2** | 10/09 a 17/09/2026 | 8 dias | `sprint/2-postagem-geocodificacao-pedidos` | Postagem de Pedidos, Geocodificação ORS e Visualização em Mapa |
| **Sprint 3** | 18/09 a 25/09/2026 | 8 dias | `sprint/3-fluxo-expresso-concorrencia` | Fluxo Expresso On-Demand, Radar e Trava Pessimista de Concorrência |
| **Sprint 4** | 26/09 a 04/10/2026 | 9 dias | `sprint/4-lote-economico-agrupamento` | Lote Econômico Assíncrono (Batch), Clusterização e Roteamento Multi-Pontos |
| **Sprint 5** | 05/10 a 13/10/2026 | 9 dias | `sprint/5-rateio-dinamico-extratos` | Motor de Rateio Financeiro 50/50 e Painéis de Extrato Transparente |
| **Sprint 6** | 14/10 a 22/10/2026 | 9 dias | `sprint/6-execucao-rotas-status-navegacao` | Execução Operacional de Rotas, Ciclo de Vida e Transbordamento GPS |
| **Sprint 7** | 23/10 a 31/10/2026 | 9 dias | `sprint/7-validacao-cenarios-reais-homologacao` | Validação Integrada com Rotas de Guarapuava, Regressão E2E e Homologação Final |

---

## 3\. Detalhamento das Sprints de Desenvolvimento

---

### Sprint 0: Setup do Monorepo, Infraestrutura Docker, Base de Testes e Checklist de Ambiente

- **Período**: 25/08/2026 a 01/09/2026 (8 dias)  
- **Branch Git**: `sprint/0-setup-monorepo-infra-testes`  
- **Requisitos Mapeados**: RNF 01 (Persistência Geoespacial), RNF 03 (Compatibilidade Multiplataforma)

#### 1\. Objetivos da Sprint

Estruturar o monorepo do projeto, subir o ambiente de banco de dados com PostGIS, configurar o backend em Laravel 13, inicializar a aplicação React Native com Expo SDK 54 (totalmente compatível com Expo Go), estruturar as suítes de testes unitários (Pest e Jest) e E2E (Maestro), e validar o ambiente do emulador Android.

#### 2\. Backlog de Tarefas

##### 2.1 Raiz do Monorepo, Infraestrutura & Documentação

- [ ] Criar a estrutura de diretórios `/backend`, `/mobile`, `/.maestro` e `/docs`.  
- [ ] Estruturar a documentação inicial em `/docs`:  
      - `docs/MASTER_PLAN.md` (Visão executiva e consolidação do plano mestre).  
      - `docs/ARQUITETURA.md` (Diagramas, arquitetura de software, DER e integrações).  
      - Criar subpasta `docs/sprints/` para os detalhamentos individuais de cada sprint conforme a implementação avançar.  
- [ ] Configurar o arquivo `docker-compose.yml` com os serviços:  
      - `postgres`: Imagem oficial `postgis/postgis:16-3.4` (PostgreSQL 16 com extensão PostGIS ativada).  
      - Configuração de volumes persistentes e portas mapeadas (`5432`).  
- [ ] Criar `README.md` raiz com manual de inicialização de containers, variáveis de ambiente e checklist do emulador.

##### 2.2 Backend (Laravel 13\)

- [ ] Inicializar projeto Laravel 13 dentro de `/backend`.  
- [ ] Configurar `.env` e conexão com banco de dados PostgreSQL/PostGIS.  
- [ ] Criar migration inicial para habilitação da extensão `CREATE EXTENSION IF NOT EXISTS postgis;`.  
- [ ] Configurar o cliente HTTP para a API do OpenRouteService (ORS) com chave de API em `.env`.  
- [ ] Configurar suíte de testes com **Pest v3** (padrão oficial Laravel 13):  
      - Execução de teste básico `php artisan test` com verificação de conexão com banco de dados.

##### 2.3 Mobile (React Native / Expo SDK 54\)

- [ ] Inicializar projeto React Native com **Expo SDK 54** (compatível nativamente com **Expo Go**, TypeScript e Expo Router) em `/mobile`.  
- [ ] Instalar e configurar bibliotecas essenciais:  
      - `react-native-maps` para renderização de mapas cartográficos.  
      - `axios` / `@tanstack/react-query` para consumo da API Laravel.  
      - `expo-secure-store` para armazenamento seguro de tokens de autenticação.  
      - `expo-location` para acesso ao GPS nativo.  
- [ ] Configurar suíte de testes unitários com **Jest** e **React Native Testing Library (RNTL)** (`npm test`).

##### 2.4 Testes End-to-End (Maestro) & Checklist do Emulador Android

- [ ] Criar o diretório `/.maestro` na raiz.  
- [ ] Criar fluxo de sanidade `/.maestro/healthcheck.yaml` verificando a inicialização do app.  
- [ ] **Checklist de Verificação do Emulador Android e Expo Go**:  
      - Validar a instalação do Android SDK e variáveis `$ANDROID_HOME` e `$PATH`.  
      - Executar comando `adb devices` para listar dispositivos conectados.  
      - Executar comando `emulator -list-avds` para verificar a existência de pelo menos 1 AVD configurado (com suporte a Google Play Services).  
      - Testar execução do app no **Expo Go** (`npx expo start`) e compilação direta no emulador (`npx expo run:android`).

#### 3\. Critérios de Aceitação & Definition of Done (DoD)

- Container Docker de PostgreSQL com PostGIS rodando de forma saudável.  
- Backend Laravel 13 respondendo a endpoint `/api/health` e executando `php artisan test` com 100% de sucesso.  
- App mobile Expo SDK 54 inicializando e funcionando perfeitamente tanto no **Expo Go** quanto no emulador Android.  
- Fluxo `healthcheck.yaml` do Maestro executado com sucesso no emulador Android.  
- PR aberto para a branch `main` seguindo os padrões convencionais.

---

### Sprint 1: Módulo de Atores, Autenticação e Perfis Isolados

- **Período**: 02/09/2026 a 09/09/2026 (8 dias)  
- **Branch Git**: `sprint/1-auth-perfis-atores`  
- **Requisitos Mapeados**: RF 01 (Must Have, RICE 6000), RNF 03 (React Native Multiplataforma)

#### 1\. Objetivos da Sprint

Implementar o sistema completo de registro, login e autorização com segmentação estrita entre os perfis de **Lojista (Cliente)** e **Entregador (Courier)** no backend e mobile.

#### 2\. Backlog de Tarefas

##### 2.1 Backend (Laravel 13\)

- [ ] Criar migrations para as tabelas:  
      - `users` (id, name, email, password, role \[client/courier/admin\], phone).  
      - `clients` (id, user\_id, business\_name, cnpj\_cpf, default\_address, lat, lng).  
      - `couriers` (id, user\_id, cnh, vehicle\_type, vehicle\_plate, current\_lat, current\_lng, cluster\_radius\_km, is\_online, is\_active).  
- [ ] Configurar autenticação via **Laravel Sanctum** (Tokens de API seguros).  
- [ ] Implementar `AuthController`:  
      - `POST /api/auth/register` (com dados condicionais para cliente ou entregador).  
      - `POST /api/auth/login` (retorno de token e role do usuário).  
      - `GET /api/auth/me` (perfil do usuário logado).  
      - `POST /api/auth/logout`.  
- [ ] Implementar Policies e Middlewares de isolamento de rotas (`EnsureUserIsClient`, `EnsureUserIsCourier`).  
- [ ] Criar testes com **Pest** (Unit/Feature):  
      - Teste de registro de cliente e entregador com validações de campos obrigatórios.  
      - Teste de login com credenciais válidas e inválidas.  
      - Teste de restrição de rota com tokens de papéis trocados.

##### 2.2 Mobile (React Native / Expo)

- [ ] Criar Contexto de Autenticação (`AuthContext`) com integração ao `expo-secure-store`.  
- [ ] Implementar Telas de Acesso:  
      - Tela de Boas-Vindas e Escolha de Perfil (Lojista / Entregador).  
      - Tela de Login unificada com validação de formulário.  
      - Telas de Cadastro dedicadas para Lojista e para Entregador.  
- [ ] Implementar Navegação Condicional baseada na role do usuário autenticado:  
      - Rota protegida `(client)` direcionando para o dashboard do lojista.  
      - Rota protegida `(courier)` direcionando para o dashboard do entregador.  
- [ ] Implementar botão de logout e tela de visualização de perfil.  
- [ ] Testes de componentes com Jest e RNTL (renderização e submissão de formulários).

##### 2.3 Testes E2E (Maestro)

- [ ] Criar `/.maestro/auth_flow.yaml`:  
      - Cenário 1: Cadastro de novo lojista e redirecionamento para o dashboard do cliente.  
      - Cenário 2: Logout e login com conta de entregador, confirmando acesso ao dashboard do condutor.

#### 3\. Critérios de Aceitação & DoD

- Usuários conseguem se registrar e autenticar recebendo tokens Sanctum.  
- O aplicativo redireciona automaticamente o lojista e o entregador para suas respectivas interfaces.  
- Testes Pest de autenticação e autorização rodando sem falhas (`php artisan test`).  
- Fluxo `auth_flow.yaml` do Maestro executando com sucesso no emulador Android.

---

### Sprint 2: Módulo do Cliente \- Postagem e Geocodificação de Pedidos

- **Período**: 10/09/2026 a 17/09/2026 (8 dias)  
- **Branch Git**: `sprint/2-postagem-geocodificacao-pedidos`  
- **Requisitos Mapeados**: RF 02 (Must Have, RICE 1800), RF 03 (Must Have, RICE 2700), RNF 01 (PostGIS)

#### 1\. Objetivos da Sprint

Permitir que o lojista cadastre solicitações de entrega com endereços de coleta e destino, realize a conversão geocodificada dos endereços via API do OpenRouteService (ORS) e selecione a modalidade de frete desejada (Expressa vs Econômica).

#### 2\. Backlog de Tarefas

##### 2.1 Backend (Laravel 13\)

- [ ] Criar migration da tabela `orders`:  
      - `id`, `client_id`, `courier_id` (nullable), `origin_address`, `origin_lat`, `origin_lng`, `dest_address`, `dest_lat`, `dest_lng`, `package_description`, `package_weight_kg`, `package_volume_m3`, `shipping_type` (`express` / `economic`), `status` (`pending`, `assigned`, `picked_up`, `delivered`, `canceled`), `is_anchor` (boolean), `individual_freight_price`, `final_freight_price`, `proof_photo_url`, `delivered_at`.  
      - Criar índice espacial PostGIS nas coordenadas de origem e destino (`ST_SetSRID(ST_MakePoint(lng, lat), 4326)`).  
- [ ] Implementar serviço de integração `GeocodingService`:  
      - Integração com a API de Geocodificação do OpenRouteService (Pelias) para converter string de endereço em latitude/longitude com foco na cidade de Guarapuava \- PR.  
- [ ] Implementar serviço de cálculo de tarifa base preliminar baseado na distância euclidiana/reta ou matriz de distância.  
- [ ] Implementar `OrderController`:  
      - `POST /api/orders/geocode` (autocomplete de endereços e retorno de coordenadas).  
      - `POST /api/orders` (criação do pedido com validação de peso, dimensões e modalidade).  
      - `GET /api/orders/my-orders` (listagem de pedidos do lojista com filtro de status).  
- [ ] Testes com **Pest**:  
      - Testes unitários do `GeocodingService` com mocks de resposta da API ORS.  
      - Testes de Feature para criação de pedido com modalidade expressa e econômica.

##### 2.2 Mobile (React Native / Expo)

- [ ] Implementar Tela de Criação de Pedido (`(client)/create-order`):  
      - Campo de busca de endereço de origem (com preenchimento automático do endereço padrão da loja).  
      - Campo de busca de endereço de destino com sugestões em tempo real via endpoint de geocodificação.  
      - Inputs de descrição da mercadoria, peso estimado e observações.  
      - Componente de seleção visual de modalidade de frete:  
        - **Modalidade Expressa**: Destaque para envio imediato e exclusivo.  
        - **Modalidade Econômica**: Destaque para envio compartilhado em lote com tarifa reduzida.  
- [ ] Integrar visualização prévia da rota em mapa interativo (`react-native-maps`) com marcadores customizados para coleta (A) e entrega (B).  
- [ ] Implementar Tela de Histórico de Pedidos do Lojista (`(client)/orders-list`) com status dinâmico.  
- [ ] Testes unitários Jest para os componentes de formulário e seleção de modalidade.

##### 2.3 Testes E2E (Maestro)

- [ ] Criar `/.maestro/create_order_flow.yaml`:  
      - Autenticar como lojista.  
      - Preencher formulário de nova entrega em Guarapuava.  
      - Selecionar a modalidade econômica e confirmar o envio.  
      - Verificar a inserção do pedido na lista com status "Pendente".

#### 3\. Critérios de Aceitação & DoD

- Endereços inseridos são convertidos corretamente em coordenadas geográficas válidas.  
- Pedidos são persistidos na tabela `orders` com dados geoespaciais e modalidade escolhida.  
- Mapa exibe os marcadores de origem e destino na tela do cliente.  
- Testes Pest e fluxo `create_order_flow.yaml` do Maestro executados com 100% de aprovação.

---

### Sprint 3: Fluxo Expresso On-Demand e Controle de Concorrência Transacional

- **Período**: 18/09/2026 a 25/09/2026 (8 dias)  
- **Branch Git**: `sprint/3-fluxo-expresso-concorrencia`  
- **Requisitos Mapeados**: RF 05 (ORS, RICE 2400), RF 07 (Lock Pessimista, RICE 1800), RF 10 (Radar Expresso, RICE 1067), RNF 02 (Segurança Transacional), RNF 04 (Performance ORS \< 2.5s)

#### 1\. Objetivos da Sprint

Construir o ecossistema de atendimento imediato sob demanda (*On-Demand*), implementando a busca espacial por entregadores no raio de atuação via PostGIS, o cálculo do traçado da rota via API ORS, o disparo do radar para os condutores com contagem regressiva e o controle estrito de concorrência com **Pessimistic Locking** (`lockForUpdate()`) para eliminar corridas duplicadas.

#### 2\. Backlog de Tarefas

##### 2.1 Backend (Laravel 13\)

- [ ] Implementar serviço de busca geoespacial no PostGIS:  
      - Query usando `ST_DWithin` para identificar condutores online dentro do raio configurado (`cluster_radius_km`) a partir da coordenada de coleta do pedido expresso.  
- [ ] Integrar `OpenRouteServiceRouteService`:  
      - Consumir endpoint `/v2/directions/driving-car` da API ORS enviando coordenadas de coleta e entrega.  
      - Retornar distância real em km, tempo estimado e geometria codificada (Polyline).  
- [ ] Implementar `ExpressDispatchController` e endpoint transacional de aceite:  
      - `GET /api/courier/radar`: Retorna ofertas expressas ativas no raio do entregador.  
      - `POST /api/orders/{id}/accept-express`:  
        - Iniciar transação de banco de dados (`DB::transaction`).  
        - Aplicar trava pessimista: `Order::where('id', $id)->lockForUpdate()->first()`.  
        - Validar se o status ainda é `pending`.  
        - Se sim: alterar status para `assigned`, associar `courier_id` e retornar sucesso com a rota traçada.  
        - Se não: lançar exceção controlada `HTTP 409 Conflict` ("Corrida já aceita por outro condutor").  
- [ ] Implementar testes com **Pest**:  
      - Teste de isolamento de transação e colisão concorrente simulando duas requisições simultâneas para o mesmo pedido.  
      - Teste de cálculo de rota via mock do ORS com validação do tempo de processamento.

##### 2.2 Mobile (React Native / Expo)

- [ ] Implementar Tela de "Radar Expresso" no app do entregador (`(courier)/express-radar`):  
      - Card de oferta de entrega urgente exibindo: valor do frete líquido, distância até o ponto de coleta e categoria do produto.  
      - Barra de progresso circular / contagem regressiva visual de 10 segundos.  
      - Botão de ação rápida "ACEITAR CORRIDA".  
- [ ] Tratamento de Resposta e Concorrência:  
      - Feedback visual de sucesso redirecionando imediatamente para a visualização da rota no mapa.  
      - Feedback visual amigável em caso de colisão de cliques ("Ops\! Outro entregador foi mais rápido").  
- [ ] Renderizar Polyline do traçado real da rota no mapa (`react-native-maps`) utilizando as coordenadas retornadas pela API ORS.  
- [ ] Testes unitários com Jest para o componente de contagem regressiva e transições de estado do radar.

##### 2.3 Testes E2E (Maestro)

- [ ] Criar `/.maestro/express_accept_flow.yaml`:  
      - Lojista cria um pedido na modalidade Expressa.  
      - Entregador acessa o Radar Expresso e visualiza a oferta ativa.  
      - Entregador clica em "ACEITAR CORRIDA" antes do término do timer.  
      - App exibe a rota traçada no mapa com o pedido no status "Aceito".

#### 3\. Critérios de Aceitação & DoD

- A trava pessimista no PostgreSQL garante que apenas 1 entregador consiga aceitar o pedido expresso, retornando erro controlado aos demais.  
- Traçado da rota gerado pelo ORS é renderizado fluidamente sobre o mapa no app mobile.  
- Testes Pest de concorrência aprovados e fluxo `express_accept_flow.yaml` do Maestro rodando com sucesso.

---

### Sprint 4: Lote Econômico e Agrupamento Assíncrono (Batch)

- **Período**: 26/09/2026 a 04/10/2026 (9 dias)  
- **Branch Git**: `sprint/4-lote-economico-agrupamento`  
- **Requisitos Mapeados**: RF 04 (Lote Econômico, RICE 1600), RF 05 (ORS Multi-paradas, RICE 2400), RNF 01 (PostGIS), RNF 04 (Performance ORS)

#### 1\. Objetivos da Sprint

Desenvolver o núcleo do Lote Econômico: comando assíncrono em segundo plano (Batch Noturno) responsável por capturar os pedidos econômicos pendentes, executar o algoritmo de agrupamento geoespacial por proximidade e otimizar as rotas com múltiplas paradas via OpenRouteService Matrix/Optimization API.

#### 2\. Backlog de Tarefas

##### 2.1 Backend (Laravel 13\)

- [ ] Criar migrations para o módulo de agrupamento:  
      - `delivery_groups`: `id`, `courier_id`, `scheduled_date`, `total_distance_km`, `total_duration_minutes`, `status` (`created`, `in_progress`, `completed`), `total_combined_cost`, `total_savings_generated`, `courier_bonus`.  
      - `group_orders`: `id`, `delivery_group_id`, `order_id`, `stop_sequence` (ordem de 1 a N), `stop_type` (`pickup` / `delivery`), `isolated_distance_km`, `shared_distance_km`, `allocated_cost`, `merchant_discount`.  
- [ ] Implementar o algoritmo de agrupamento geoespacial no Service `BatchClusteringService`:  
      - Seleção de pedidos pendentes da modalidade `economic`.  
      - Identificação de pedidos âncora (`is_anchor`) ou clusterização por vizinho mais próximo com base em coordenadas PostGIS.  
      - Limitação de pacotes e cubagem total por condutor escalado.  
- [ ] Integrar otimização multi-pontos com o OpenRouteService:  
      - Consumo da API ORS Optimization (`/v2/optimization`) ou Matrix API para definir a sequência ótima de paradas minimizando a distância total percorrida.  
- [ ] Implementar comando Artisan:  
      - `php artisan zarpa:process-economic-batch` (agendável no `routes/console.php`).  
- [ ] Criar testes com **Pest**:  
      - Teste unitário do `BatchClusteringService` com massa de dados de teste de Guarapuava contendo pedidos dispersos e agrupáveis.  
      - Teste de persistência de `delivery_groups` e `group_orders` com sequência correta de paradas.

##### 2.2 Mobile (React Native / Expo)

- [ ] Módulo do Lojista:  
      - Atualizar card de pedido econômico exibindo badge informativo: "Aguardando processamento do lote noturno".  
      - Após a execução do batch, atualizar status para "Lote Gerado: Entrega Agendada".  
- [ ] Módulo do Entregador:  
      - Criar visualização prévia da lista de Lotes Econômicos atribuídos na tela inicial do condutor.  
- [ ] Testes de renderização com Jest para os novos badges e estados do pedido agrupado.

##### 2.3 Testes E2E (Maestro)

- [ ] Criar fluxo auxiliar de validação do lote econômico:  
      - Criar múltiplos pedidos econômicos via API / App.  
      - Disparar a rotina do batch.  
      - Verificar no app do lojista a transição de estado para pedido agrupado.

#### 3\. Critérios de Aceitação & DoD

- O comando `zarpa:process-economic-batch` processa múltiplos pedidos pendentes e os organiza em grupos otimizados de entregas.  
- As paradas de coleta e entrega são sequenciadas logicamente na tabela `group_orders`.  
- Testes Pest do agrupador aprovados com cobertura de casos de borda (sem pedidos, pedidos distantes).

---

### Sprint 5: Motor de Rateio Dinâmico 50/50 e Extratos Financeiros

- **Período**: 05/10/2026 a 13/10/2026 (9 dias)  
- **Branch Git**: `sprint/5-rateio-dinamico-extratos`  
- **Requisitos Mapeados**: RF 06 (Módulo de Rateio 50/50, RICE 1200), RF 11 (Extrato e Histórico, RICE 1400\)

#### 1\. Objetivos da Sprint

Implementar o motor matemático de rateio cooperativo de frete, calculando a economia gerada pelas rotas compartilhadas, distribuindo 50% como bônus de produtividade para o entregador e 50% como desconto retroativo proporcional para os lojistas, com transparência nos extratos financeiros de ambos os atores.

#### 2\. Backlog de Tarefas

##### 2.1 Backend (Laravel 13\)

- [ ] Implementar `DynamicApportionmentService`:  
      - Cálculo da distância total que seria percorrida em corridas individuais ($D\_{isolada} \= \\sum d\_i$).  
      - Obtenção da distância real unificada do lote agrupado ($D\_{conjunta}$).  
      - Cálculo da economia bruta gerada: $E\_{total} \= (D\_{isolada} \\times \\text{tarifa\_km}) \- (D\_{conjunta} \\times \\text{tarifa\_km})$.  
      - Divisão equitativa (50/50):  
        - **Bônus do Entregador**: $B\_{courier} \= E\_{total} \\times 0.50$.  
        - **Desconto dos Lojistas**: $D\_{clientes} \= E\_{total} \\times 0.50$, rateado proporcionalmente à distância individual de cada frete: $$\\text{Desconto}*i \= D*{clientes} \\times \\left( \\frac{d\_i}{D\_{isolada}} \\right)$$  
      - Atualização dos campos `final_freight_price` na tabela `orders` e `courier_bonus` em `delivery_groups`.  
- [ ] Implementar endpoints de extrato financeiro:  
      - `GET /api/client/financial-statement`: Resumo de entregas realizadas, total pago, economia acumulada pelo rateio e percentual de desconto obtido.  
      - `GET /api/courier/financial-statement`: Resumo de jornadas concluídas, total base recebido, bônus de produtividade por lotes e rendimento médio por km rodado.  
- [ ] Testes unitários com **Pest**:  
      - Teste da fórmula de rateio com os valores de referência do TCC (Caso A vs Caso B da simulação de 16 km vs 11 km).  
      - Testes de consistência matemática garantindo que a soma dos descontos seja rigorosamente igual à metade da economia total.

##### 2.2 Mobile (React Native / Expo)

- [ ] Implementar Tela de Extrato do Lojista (`(client)/financial`):  
      - Card de destaque: "Economia Total com o Zarpa (R$)".  
      - Tabela detalhada comparando o "Valor Original sem Rateio" versus "Valor Final com Desconto Compartilhado".  
- [ ] Implementar Tela de Extrato do Entregador (`(courier)/financial`):  
      - Resumo de faturamento total, ganhos por frete base e ganhos extras por bônus de lote econômico.  
      - Indicador de eficiência financeira (R$/km rodado).  
- [ ] Testes unitários com Jest para os componentes de exibição de extrato e cálculos formatados em moeda (BRL).

##### 2.3 Testes E2E (Maestro)

- [ ] Criar `/.maestro/financial_statement_flow.yaml`:  
      - Autenticar como lojista e acessar a aba de extrato financeiro, validando a exibição da economia gerada pelo rateio.  
      - Autenticar como entregador e acessar o extrato, validando a exibição do bônus de produtividade.

#### 3\. Critérios de Aceitação & DoD

- O cálculo matemático do rateio 50/50 é executado de forma determinística e precisa após o processamento do lote.  
- Os lojistas visualizam com clareza o desconto recebido em seus fretes econômicos.  
- O entregador visualiza seu bônus de produtividade adicionado ao saldo final da rota.  
- Testes Pest e fluxo `financial_statement_flow.yaml` do Maestro executados com 100% de sucesso.

---

### Sprint 6: Execução Operacional de Rotas, Atualização de Status e Transbordamento GPS

- **Período**: 14/10/2026 a 22/10/2026 (9 dias)  
- **Branch Git**: `sprint/6-execucao-rotas-status-navegacao`  
- **Requisitos Mapeados**: RF 08 (Agenda de Tarefas, RICE 2000), RF 09 (Atualização de Status, RICE 6000), RF 12 (Transbordamento GPS, RICE 2000\)

#### 1\. Objetivos da Sprint

Construir a experiência operacional em campo para o entregador: a tela de agenda de rotas sequenciadas do lote econômico com lista interativa de paradas, os botões manuais de transição de ciclo de vida do pedido ("Coletado", "A caminho", "Entregue") com registro de comprovante, e o transbordamento direto de coordenadas para aplicativos de navegação externa (Google Maps e Waze).

#### 2\. Backlog de Tarefas

##### 2.1 Backend (Laravel 13\)

- [ ] Implementar endpoints de gerenciamento da jornada do entregador:  
      - `GET /api/courier/active-group`: Retorna o lote econômico ativo com a lista ordenada de paradas e dados de cada pedido.  
      - `PATCH /api/orders/{id}/status`:  
        - Validação das transições permitidas (`assigned` \-\> `picked_up` \-\> `delivered`).  
        - Registro de timestamp do momento exato da alteração.  
      - `POST /api/orders/{id}/proof`: Upload de comprovante de entrega (imagem ou assinatura).  
- [ ] Implementar endpoint de acompanhamento para o lojista:  
      - `GET /api/orders/{id}/tracking`: Detalhes do status corrente do pedido e histórico de alterações com timestamps.  
- [ ] Testes com **Pest**:  
      - Testes de Feature validando a máquina de estados do pedido e rejeição de transições inválidas (ex: tentar marcar como "Entregue" sem ter sido "Coletado").  
      - Teste de upload de comprovante de entrega.

##### 2.2 Mobile (React Native / Expo)

- [ ] Implementar Tela de "Agenda de Rotas Sequenciadas" (`(courier)/route-agenda`):  
      - Cabeçalho fixo com métricas do lote: quilometragem total, tempo estimado e remuneração consolidada.  
      - Lista vertical interativa com as paradas ordenadas cronologicamente (identificando claramente o tipo: *Coleta no Lojista X* ou *Entrega ao Cliente Y*).  
      - Marcador visual indicando a parada atual em atendimento.  
- [ ] Ações Rápidas de Operação:  
      - Botão de transição de status em 1 clique ("Confirmar Coleta" / "Confirmar Entrega").  
      - Modal para captura/anexação de foto como comprovante de entrega.  
- [ ] Implementar Transbordamento de Coordenadas (Deep Linking):  
      - Botão "Navegar até a parada": abre o aplicativo nativo de navegação do dispositivo móvel (**Google Maps** via `geo:lat,lng` ou **Waze** via `waze://?ll=lat,lng&navigate=yes`).  
- [ ] Módulo do Cliente:  
      - Tela de detalhes do pedido com linha do tempo visual do ciclo de vida atualizada.  
- [ ] Testes unitários com Jest para a lista de paradas e componente de transbordamento.

##### 2.3 Testes E2E (Maestro)

- [ ] Criar `/.maestro/delivery_execution_flow.yaml`:  
      - Entregador inicia a execução da rota na Agenda.  
      - Entregador confirma a coleta da primeira parada.  
      - Entregador avança para a parada de entrega e confirma a conclusão.  
      - Lojista visualiza a atualização imediata para status "Entregue".

#### 3\. Critérios de Aceitação & DoD

- O condutor visualiza a sequência ordenada de coletas e entregas sem ambiguidades operacionais.  
- O botão de navegação externa invoca corretamente o Google Maps/Waze no dispositivo Android com as coordenadas da parada.  
- O ciclo de vida do pedido é atualizado em tempo real no banco de dados.  
- Testes Pest e fluxo `delivery_execution_flow.yaml` do Maestro executados com 100% de sucesso.

---

### Sprint 7: Validação em Cenários Reais de Guarapuava, Regressão E2E e Homologação do MVP

- **Período**: 23/10/2026 a 31/10/2026 (9 dias)  
- **Branch Git**: `sprint/7-validacao-cenarios-reais-homologacao`  
- **Requisitos Mapeados**: Todos os Requisitos do MVP (RF 01 ao RF 12, RNF 01 ao RNF 04\)

#### 1\. Objetivos da Sprint

Realizar a validação integrada de ponta a ponta do sistema utilizando rotas e coordenadas geográficas reais de estabelecimentos e bairros do município de Guarapuava (PR), executar a suíte completa de testes de regressão automatizados (Pest \+ Maestro), aplicar refinamentos de estabilidade e usabilidade e congelar a versão final homologada do software para o encerramento do desenvolvimento do TCC 2 em 31/10/2026.

#### 2\. Backlog de Tarefas

##### 2.1 Validação com Cenários Reais de Guarapuava

- [ ] Criar Seeder com dados geográficos de estabelecimentos e bairros reais de Guarapuava (PR) (ex: Centro, Santa Cruz, Bonsucesso, Batel, Santana, Vila Carli).  
- [ ] Simular o **Cenário Expresso**:  
      - Emissão de pedidos sob demanda urgentes em diferentes quadrantes da cidade.  
      - Validação da resposta do radar por proximidade e do traçado das ruas via ORS.  
- [ ] Simular o **Cenário de Lote Econômico & Rateio Dinâmico**:  
      - Emissão simultânea de 10 pedidos econômicos distribuídos entre múltiplos comércios locais.  
      - Execução da rotina noturna de agrupamento.  
      - Verificação analítica dos resultados:  
        - Distâncias individuais somadas vs distância real consolidada da rota.  
        - Repartição exata de 50% de bônus ao motoboy e 50% de desconto proporcional aos lojistas.

##### 2.2 Regressão e Automação Completa de Qualidade

- [ ] Executar a suíte de testes do Backend no padrão Laravel 13 (`php artisan test` com Pest) garantindo 100% de assertividade em todos os testes unitários e de integração.  
- [ ] Executar a suíte de testes unitários do Mobile (`npm test` com Jest).  
- [ ] Executar todos os fluxos E2E com o **Maestro** no emulador Android de forma sequencial e integrada:  
      - `healthcheck.yaml`  
      - `auth_flow.yaml`  
      - `create_order_flow.yaml`  
      - `express_accept_flow.yaml`  
      - `delivery_execution_flow.yaml`  
      - `financial_statement_flow.yaml`

##### 2.3 Refinamento de Interface, Tratamento de Exceções & Polish

- [ ] Revisão de mensagens de feedback, loaders, estados vazios (*empty states*) e tratamento de quedas de conexão.  
- [ ] Ajuste final de layout nos fluxos de lojistas e entregadores garantindo alta fidelidade aos protótipos do Figma do TCC 1\.  
- [ ] Atualização final do arquivo `README.md` raiz com comandos simplificados de execução, documentação dos endpoints da API e instruções para reprodução dos testes automatizados.  
- [ ] Criação de tag de versão estável no Git: `v1.0.0-mvp`.

#### 3\. Critérios de Aceitação & DoD

- Todos os fluxos operacionais (Expressa, Econômica, Rateio 50/50, Radar, Agenda e Transbordamento GPS) validados e funcionando sem erros com dados reais de Guarapuava.  
- Suíte completa de testes Pest e Jest com 100% de testes passando.  
- Suíte completa de fluxos Maestro executada com sucesso no emulador Android.  
- Branch `sprint/7-validacao-cenarios-reais-homologacao` integrada à `main` via PR revisado e aprovado.  
- Software MVP completamente funcional, homologado e congelado em 31/10/2026.

---

## 4\. Guia Rápido de Execução e Testes do Projeto

### 4.1 Inicialização do Ambiente

```shell
# 1. Clonar o repositório
git clone <url-do-repositorio>
cd zarpa-monorepo

# 2. Subir a infraestrutura Docker (PostgreSQL + PostGIS)
docker-compose up -d

# 3. Inicializar o Backend (Laravel 13)
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve

# 4. Inicializar o Mobile (React Native / Expo SDK 54)
cd ../mobile
npm install
npx expo start # Para executar no Expo Go ou pressionar 'a' para emulador Android
# ou para build nativo direto:
# npx expo run:android
```

### 4.2 Execução das Suítes de Testes

#### Backend (Laravel 13 \+ Pest v3)

```shell
cd backend
php artisan test
```

#### Mobile (Jest \+ RNTL)

```shell
cd mobile
npm test
```

#### Testes End-to-End (Maestro)

```shell
# Com o emulador Android em execução e o app instalado:
maestro test .maestro/healthcheck.yaml
maestro test .maestro/auth_flow.yaml
maestro test .maestro/create_order_flow.yaml
maestro test .maestro/express_accept_flow.yaml
maestro test .maestro/delivery_execution_flow.yaml
maestro test .maestro/financial_statement_flow.yaml
```

---

*Este plano de sprints foi concebido para guiar de forma pragmática e rigorosa todas as etapas de construção do MVP da plataforma Zarpa, garantindo a entrega do software funcional até o prazo limite de 31/10/2026.*  
