# SPRINT 2: Módulo do Cliente - Postagem e Geocodificação de Pedidos

- **Período**: 10/09/2026 a 17/09/2026 (8 dias)
- **Branch Git**: `sprint/2-postagem-geocodificacao-pedidos`
- **Requisitos Mapeados**: 
  - **RF 02**: Interface de Postagem de Pedidos com Cubagem/Peso (Must Have, RICE 1800)
  - **RF 03**: Geocodificação de Endereços (Texto -> Coordenadas) (Must Have, RICE 2700)
  - **RNF 01**: Persistência Geoespacial (PostGIS, latência < 1.5s)
  - **RNF 03**: Compatibilidade Multiplataforma (Expo SDK 54 / Expo Go)

---

## 1. Objetivos da Sprint

Capacitar o Lojista (*Client*) a criar solicitações de entrega no aplicativo móvel com precisão geográfica. O fluxo contempla a conversão inteligente de endereços textuais em coordenadas geográficas, o cálculo da rota viária real e distância percorrida através do **servidor OSRM dedicado da UTFPR** com **Basic Auth**, a exibição cartográfica da rota com marcadores no mapa e a seleção transparente entre as modalidades **Expressa** (envio imediato e exclusivo) e **Econômica** (lote compartilhado com desconto cooperativo).

---

## 2. Integração com Servidor OSRM e Geocodificação

### 2.1 Servidor OSRM Dedicado (Roteamento Viário Real)
- **Host**: `https://osrmcar.debug.app.br`
- **Autenticação**: HTTP Basic Auth (configurado via variáveis de ambiente `OSRM_USERNAME` e `OSRM_PASSWORD` no `.env`)
- **Autenticação**: HTTP Basic Auth
- **Contrato de Rota**:
  `GET /route/v1/driving/{coordinates}?steps=true&overview=full&geometries=polyline`
- **Ordem das Coordenadas**:
  - Padrão OSRM: `{lon1},{lat1};{lon2},{lat2}` (longitude X, latitude Y).
  - Exemplo para Guarapuava (PR): `-51.478711606049515,-25.349422549345178;-51.476912246948245,-25.38965972173386`.
  - O serviço `OsrmRoutingService` no Laravel deve normalizar e suportar parâmetros no formato `(lat, lng)`, realizando a inversão necessária para a query string do OSRM.
- **Extração de Dados**:
  - `routes[0].distance`: Distância viária precisa em metros (convertida para quilômetros).
  - `routes[0].duration`: Duração estimada em segundos (convertida para minutos).
  - `routes[0].geometry`: String codificada em Polyline (decodificada no app móvel para polilinha gráfica no mapa).
  - `routes[0].legs[0].steps`: Lista de instruções e manobras do percurso.

### 2.2 Serviço de Geocodificação de Endereços (`GeocodingService`)
Como o OSRM é exclusivamente uma *routing engine*, a conversão de endereço textual para coordenadas (`RF 03`) opera de forma desacoplada:
1. **API de Geocodificação Externa (Nominatim / Photon / Pelias)**: Busca textual delimitada na região de Guarapuava - PR (`viewbox` e bounded).
2. **Dicionário Geográfico Local de Fallback (Alta Disponibilidade)**: Catálogo com pontos de referência e bairros estratégicos de Guarapuava (Centro, Santa Cruz, Batel, Bonsucesso, UTFPR, etc.) para garantir operação offline e estabilidade determinística nos testes automatizados (Pest e Maestro).

---

## 3. Backlog de Tarefas Detalhado

### 3.1 Backend (Laravel 13 - PHP 8.3+)

- [ ] **Migration e Schema PostGIS da tabela `orders`**:
  - Colunas relacionais e dados básicos:
    - `id`, `client_id` (FK `clients`), `courier_id` (FK `couriers`, nullable).
    - `package_description` (string), `package_weight_kg` (decimal), `package_volume_m3` (decimal).
    - `shipping_type` (`express` ou `economic`).
    - `status` (`pending`, `assigned`, `picked_up`, `delivered`, `canceled`).
    - `is_anchor` (boolean, default false).
    - `individual_freight_price` (decimal 8,2), `final_freight_price` (decimal 8,2, nullable).
    - `distance_km` (decimal 8,2), `estimated_duration_minutes` (integer).
    - `route_geometry` (text, nullable - armazena a polyline da rota).
    - `proof_photo_url` (string, nullable), `delivered_at` (timestamp, nullable).
    - `origin_address` (string), `dest_address` (string).
    - `origin_lat` (decimal 10,8), `origin_lng` (decimal 11,8).
    - `dest_lat` (decimal 10,8), `dest_lng` (decimal 11,8).
  - Colunas espaciais PostGIS:
    - `origin_location geometry(Point, 4326)`
    - `dest_location geometry(Point, 4326)`
    - Índices espaciais GiST em `origin_location` e `dest_location`.

- [ ] **Eloquent Model `Order`**:
  - Relacionamentos `belongsTo(Client::class)` e `belongsTo(Courier::class)`.
  - Scopes de consulta (`pending()`, `forClient()`, `economic()`, `express()`).
  - Casts de tipos numéricos e timestamps.

- [ ] **Serviço de Roteamento `OsrmRoutingService`**:
  - Cliente HTTP Laravel com autenticação Basic Auth configurada via variáveis de ambiente (`OSRM_BASE_URL`, `OSRM_USERNAME`, `OSRM_PASSWORD`).
  - Método `calculateRoute(float $originLat, float $originLng, float $destLat, float $destLng): array`.
  - Tratamento de exceções com timeout e fallback caso o servidor externo esteja inacessível.

- [ ] **Serviço de Geocodificação `GeocodingService`**:
  - Método `searchAddress(string $query): array`.
  - Resolução de texto para coordenadas com foco em Guarapuava.

- [ ] **Serviço de Precificação Preliminar `FreightCalculatorService`**:
  - Fórmula base: `Tarifa Base (R$ 6,00) + (Distância em KM * R$ 2,50/km) + Adicional de Peso (> 5kg)`.
  - Diferenciação por modalidade:
    - **Expressa**: Preço individual integral (tarifa normal).
    - **Econômica**: Preço preliminar com previsão de desconto dinâmico no agrupamento noturno.

- [ ] **Controller `OrderController` e Rotas**:
  - `GET /api/orders/geocode`: Autocomplete de endereços com sugestões.
  - `POST /api/orders/estimate`: Simula rota (OSRM) + estimativa de frete sem persistir no banco.
  - `POST /api/orders`: Criação definitiva do pedido associado ao lojista autenticado.
  - `GET /api/orders/my-orders`: Listagem de pedidos do lojista com filtros por status (`pending`, `assigned`, etc.).
  - `GET /api/orders/{id}`: Detalhes completos do pedido com geometria da rota.

- [ ] **Testes com Pest v3**:
  - Teste Unitário do `OsrmRoutingService` com mock da resposta HTTP do OSRM.
  - Teste Unitário do `GeocodingService` e `FreightCalculatorService`.
  - Teste de Feature da API de criação de pedidos (validação de campos, cálculo de preço e persistência PostGIS).
  - Teste de isolamento: entregador não pode postar pedidos de lojista.

---

### 3.2 Mobile (React Native / Expo SDK 54)

- [ ] **Tela de Criação de Pedido (`(client)/create-order.tsx`)**:
  - Endereço de Coleta: preenchimento automático a partir do endereço cadastrado do lojista (`user.client.default_address`), permitindo edição se necessário.
  - Endereço de Entrega: campo de busca com *debounce* consumindo o endpoint de geocodificação da API.
  - Especificação do Pacote: campos para descrição do item, peso em kg e dimensões/tamanho aproximado.
  - Seletor Visual de Modalidade de Frete:
    - **Expressa (⚡ Imediato)**: Frete direto, exclusivo para motoboy sob demanda.
    - **Econômica (🌱 Compartilhado)**: Coleta programada, integrada ao lote noturno com desconto pelo rateio 50/50.
  - Card de Resumo de Cotação: distância calculada (km), tempo estimado e valor do frete.

- [ ] **Componente de Mapa Interativo da Rota (`RouteMapPreview.tsx`)**:
  - Utilização de `react-native-maps`.
  - Marcador A (Origem / Loja) e Marcador B (Destino / Cliente).
  - Traçado viário renderizado via `<Polyline />` com decodificação das coordenadas recebidas da rota OSRM.
  - Ajuste automático de enquadramento do mapa (`fitToCoordinates`).

- [ ] **Tela de Histórico e Acompanhamento de Pedidos (`(client)/orders.tsx` ou aba no Dashboard)**:
  - Lista de cartões com status visual colorido (`Pendente`, `Atribuído`, `Em Rota`, `Entregue`).
  - Badge indicando a modalidade (Expressa vs Econômica).
  - Botão de ação rápida na Dashboard do Lojista levando à criação de novo pedido.

- [ ] **Testes com Jest e React Native Testing Library**:
  - Testes do formulário de criação de pedidos e validação de campos obrigatórios.
  - Teste do seletor de modalidade Expressa / Econômica.
  - Teste da renderização dos cards de pedidos na lista.

---

### 3.3 Testes End-to-End (Maestro)

- [ ] **Fluxo `/.maestro/create_order_flow.yaml`**:
  - Autenticar como lojista de teste (`lojista@zarpa.com.br`).
  - Navegar da Dashboard para a tela "Novo Pedido de Entrega".
  - Informar endereço de destino em Guarapuava e preencher dados do pacote.
  - Selecionar a modalidade "Econômica".
  - Confirmar a emissão do frete.
  - Validar redirecionamento e presença do pedido recém-criado na listagem com status "Pendente".

---

## 4. Definition of Done (DoD)

- [ ] Migration `orders` executada com sucesso com colunas espaciais PostGIS e índices GiST.
- [ ] Conexão com o servidor OSRM (`https://osrmcar.debug.app.br`) via Basic Auth integrada e coberta por testes.
- [ ] Endpoints de geocodificação, estimativa e criação de pedidos operacionais na API Laravel.
- [ ] Tela de postagem de pedidos funcional no app móvel com pré-visualização de rota no mapa.
- [ ] 100% dos testes do backend passando (`php artisan test` via Pest v3).
- [ ] 100% dos testes unitários do mobile passando (`npm test` via Jest/RNTL).
- [ ] Fluxo E2E `create_order_flow.yaml` aprovado via Maestro.
- [ ] Commits realizados na branch `sprint/2-postagem-geocodificacao-pedidos` seguindo Conventional Commits.
