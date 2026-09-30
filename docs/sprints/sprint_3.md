# SPRINT 3: Fluxo Expresso On-Demand e Controle de Concorrência Transacional

- **Período**: 18/09/2026 a 25/09/2026 (8 dias)
- **Branch Git**: `sprint/3-fluxo-expresso-concorrencia`
- **Requisitos Mapeados**:
  - **RF 05**: Integração com Roteamento Viário OSRM e Polylines (Must Have, RICE 2400)
  - **RF 07**: Controle de Concorrência Transacional com Bloqueio Pessimista (`lockForUpdate`) (Must Have, RICE 1800)
  - **RF 10**: Radar de Ofertas Expressas em Tempo Real com Contagem Regressiva de 10s (Should Have, RICE 1067)
  - **RNF 01**: Persistência Geoespacial em PostGIS (`SRID 4326`, índices GiST, latência < 1.5s)
  - **RNF 02**: Segurança Transacional ACID e Eliminação de Corridas Duplicadas
  - **RNF 03**: Compatibilidade Multiplataforma (Expo SDK 54 / Expo Go)
  - **RNF 04**: Desempenho do Motor de Roteamento Viário (< 2.5s)

---

## 1. Objetivos da Sprint

Construir o ecossistema de atendimento imediato sob demanda (*On-Demand*), conectando lojistas e entregadores em tempo real para entregas expressas.
O fluxo contempla:
1. Busca espacial por condutores disponíveis e online dentro do seu raio de atuação (`cluster_radius_km`) utilizando PostGIS (`ST_DWithin`).
2. Disponibilização de ofertas ativas no Radar Expresso do aplicativo do condutor, com card detalhado e contagem regressiva de 10 segundos.
3. Aceite de corrida com controle estrito de concorrência através de **Pessimistic Locking** (`lockForUpdate()`) no PostgreSQL, garantindo atomicidade e retornando `HTTP 409 Conflict` caso múltiplos entregadores disputem a mesma oferta.
4. Confirmação instantânea e transição para a visualização da rota viária completa no mapa, renderizada a partir das coordenadas e polilinha calculadas pelo servidor OSRM dedicado da UTFPR.

---

## 2. Arquitetura Técnica e Concorrência

### 2.1 Busca Geoespacial com PostGIS (`ST_DWithin`)
Para determinar quais entregadores estão aptos a receber uma oferta expressa:
- A localização do entregador é armazenada na coluna `couriers.current_location` como `geometry(Point, 4326)`.
- O ponto de coleta do pedido é armazenado em `orders.origin_location` como `geometry(Point, 4326)`.
- A query de radar utiliza a função espacial nativa com projeção geográfica em metros:
  ```sql
  ST_DWithin(
      orders.origin_location::geography,
      couriers.current_location::geography,
      couriers.cluster_radius_km * 1000
  )
  ```
- O filtro seleciona exclusivamente pedidos com `shipping_type = 'express'` e `status = 'pending'`.

### 2.2 Controle de Concorrência Transacional (Pessimistic Locking)
Para evitar que múltiplos entregadores aceitem a mesma entrega expressa simultaneamente (*Race Condition*):
```php
return DB::transaction(function () use ($orderId, $courier) {
    // 1. Bloqueia a linha no PostgreSQL exclusivamente para esta transação
    $order = Order::where('id', $orderId)
        ->lockForUpdate()
        ->first();

    if (!$order) {
        return response()->json(['message' => 'Pedido não encontrado.'], 404);
    }

    // 2. Valida se o pedido ainda se encontra disponível
    if ($order->status !== 'pending' || $order->shipping_type !== 'express') {
        return response()->json([
            'message' => 'Ops! Esta corrida já foi aceita por outro condutor parceiro.',
            'error_code' => 'ORDER_ALREADY_CLAIMED',
        ], 409); // 409 Conflict
    }

    // 3. Atribui o entregador e avança o status
    $order->update([
        'courier_id' => $courier->id,
        'status' => 'assigned',
    ]);

    return response()->json([
        'message' => 'Corrida expressa aceita com sucesso!',
        'order' => $order->fresh(['client.user']),
    ], 200);
});
```

---

## 3. Backlog de Tarefas Detalhado

### 3.1 Backend (Laravel 13 - PHP 8.3+)

- [x] **Sincronização Espacial do Entregador**:
  - Atualização do model `Courier` com evento/método para sincronizar `current_lat` e `current_lng` na coluna PostGIS `current_location`.
  - Endpoints em `routes/api.php`:
    - `POST /api/courier/location`: Atualiza latitude e longitude atuais do condutor.
    - `PATCH /api/courier/status`: Alterna o status `is_online` (disponível no radar).

- [x] **Serviço de Despacho Geoespacial (`CourierDispatchService`)**:
  - Método `getAvailableExpressOrders(Courier $courier)`:
    - Retorna pedidos pendentes da modalidade expressa dentro do raio `cluster_radius_km` do condutor online via PostGIS `ST_DWithin`.
    - Calcula a distância viária/direta da posição do condutor até a origem do pedido (`ST_Distance` geodésico).

- [x] **Controller de Despacho Expresso (`ExpressDispatchController`)**:
  - `GET /api/courier/radar`: Retorna a lista de oportunidades expressas vigentes para o condutor autenticado.
  - `POST /api/orders/{id}/accept-express`:
    - Executa transação com `lockForUpdate()`.
    - Atribui pedido ao condutor se o status for `pending`.
    - Responde com `HTTP 409 Conflict` se outro condutor aceitou antes.

- [x] **Recusa de Pedidos Expressos pelo Condutor**:
  - Migration e tabela `order_rejections` registrando pedidos descartados por entregador.
  - Endpoint `POST /api/orders/{id}/reject-express`: Registra recusa e impede reexibição no radar.
  - Exclusão dinâmica no `CourierDispatchService` via `whereNotIn` dos pedidos rejeitados pelo condutor.

- [x] **Perfil e Ajuste de Raio de Atuação (`cluster_radius_km`)**:
  - Endpoint `GET /api/courier/profile` e `PATCH /api/courier/profile` no `ExpressDispatchController`.
  - Atualização validada de raio (1 a 50 km), tipo de veículo (moto, bike, carro), placa e CNH.

- [x] **Testes com Pest v3**:
  - Teste de atualização de posição geográfica e status online do entregador.
  - Teste de busca espacial `ST_DWithin` (entregadores no raio visualizam a oferta; fora do raio são excluídos).
  - Teste unitário/feature de aceite bem-sucedido com mudança de status para `assigned`.
  - Teste de concorrência transacional simulando colisão: a primeira requisição obtém `200 OK` e a segunda é rejeitada com `409 Conflict`.
  - Teste de autorização: lojistas não podem acessar o radar ou aceitar pedidos expressos.
  - Teste de recusa de pedido: o chamado desaparece para quem recusou, mas permanece disponível para outros entregadores.
  - Teste de perfil e alteração do raio de atuação do condutor.

---

### 3.2 Mobile (React Native / Expo SDK 54)

- [x] **Tela de Radar Expresso (`mobile/app/(courier)/express-radar.tsx`)**:
  - Listagem de chamados urgentes disponíveis no raio do condutor.
  - Card de oportunidade exibindo ganho líquido, distância, descrição e contagem de 10s.
  - Botão de "Recusar Chamado" e botão de "Aceitar Corrida".
  - Bloqueio rígido quando o entregador estiver offline (`is_online = false`), impedindo chamados indevidos e oferecendo botão para ativação rápida.

- [x] **Aba e Tela de Perfil do Entregador (`mobile/app/(courier)/profile.tsx`)**:
  - Nova aba "Meu Perfil" no menu inferior do entregador (`_layout.tsx`).
  - Seletor interativo de Raio de Atuação (presets de 3km, 5km, 8km, 10km, 15km e input manual).
  - Formulário com dados do veículo (moto, bike, carro), placa, CNH e contato.
  - Integração com `PATCH /api/courier/profile` e feedback visual claro.

- [x] **Mapas Interativos Otimizados para Guarapuava - PR (`RouteMapPreview.tsx`)**:
  - Resolução definitiva de tela cinza/branca no Android e navegadores:
    - **Web**: Renderização híbrida via Leaflet / OpenStreetMap com traçado viário OSRM em Guarapuava.
    - **Mobile**: Motor de tiles em React Native puro (CartoDB Voyager / OpenStreetMap) com projeção Mercator determinística, eliminando dependência do SDK pago do Google Maps e incompatibilidades da New Architecture/Fabric no Android, com pino customizado do condutor, círculo do raio de radar dinâmico (`radiusKm * 1000`) e controles interativos de zoom (+, -, recentralizar).
  - Painel de Telemetria Numérica em Tempo Real no Dashboard e Radar: Latitude, Longitude, Polo urbano (Guarapuava) e status de sincronização com a base PostGIS do backend Docker.
  - Captação do GPS físico real do dispositivo do entregador através de `expo-location` para sincronização com o radar.

- [x] **Tratamento de Concorrência e Conflito (409)**:
  - Captura do erro `409 Conflict` na requisição de aceite.
  - Feedback visual amigável ("Ops! Outro entregador foi mais rápido").

- [x] **Tela de Entrega Ativa (`mobile/app/(courier)/active-delivery.tsx`)**:
  - Exibição da rota aceita com mapa interativo e Polyline OSRM traçada **diretamente no app**.
  - Remoção de dependências de aplicativos externos de GPS (Google Maps/Waze externos), mantendo navegação e acompanhamento nativos.
  - Bloqueio e interceptação de saída sem cancelamento: o entregador não pode deixar uma corrida em andamento sem confirmar o cancelamento.
  - Ciclo de vida da entrega expressa: Coleta (`/api/orders/{id}/pickup`), Entrega (`/api/orders/{id}/deliver`) e Cancelamento (`/api/orders/{id}/cancel-delivery`).

- [x] **Testes com Jest e React Native Testing Library**:
  - Testes do timer regressivo de 10 segundos no componente do radar.
  - Testes de renderização dos cards compactos de oferta e disparo do aceite.
  - Teste de resfriamento (cooldown de 30s) quando o chamado expira sem ação do entregador.
  - Teste do tratamento de erro 409 de colisão de corridas por bloqueio pessimista.
  - Teste do bloqueio de radar offline e ativação rápida.
  - Testes da tela de perfil com alteração de raio de atuação e validações.
  - Testes da tela de corrida ativa (`ActiveDelivery.test.tsx`) com fluxo de coleta, entrega, cancelamento e interceptação de saída.

---

### 3.3 Testes End-to-End (Maestro)

- [x] **Fluxo `/.maestro/express_accept_flow.yaml`**:
  - Autenticação como condutor parceiro (`login-quick-courier`).
  - Verificação do status online.
  - Acesso ao Radar de Entregas Expressas.
  - Validação dos elementos e navegação de retorno.

---

## 4. Definition of Done (DoD)

- [x] Query geoespacial PostGIS `ST_DWithin` implementada e testada no backend.
- [x] Bloqueio pessimista `lockForUpdate()` ativo na rota de aceite com tratamento estrito de `409 Conflict`.
- [x] Endpoints `/api/courier/radar`, `/api/orders/{id}/accept-express`, `/api/orders/{id}/reject-express`, `/api/orders/{id}/pickup`, `/api/orders/{id}/deliver`, `/api/orders/{id}/cancel-delivery`, `/api/courier/location`, `/api/courier/status` e `/api/courier/profile` operacionais.
- [x] Tela de Radar Expresso com mapa cobrindo quase toda a tela em modo sem bordas, cards popups compactos na parte inferior, contagem regressiva de 10s e cooldown de 30s.
- [x] Tela de Perfil do Entregador com ajuste do raio de atuação em km e dados do veículo.
- [x] Mapas interativos híbridos (Leaflet Web / OSM Mobile) funcionando tanto no navegador quanto no app mobile, centrados em Guarapuava - PR, com traçado interno de rota viária.
- [x] Interface limpa sem excesso de emojis, utilizando ícones vetoriais modernos (`Ionicons`).
- [x] 100% dos testes do backend passando (32 testes e 191 assertions via Pest v3).
- [x] 100% dos testes do mobile passando (30 testes em 9 suítes via Jest/RNTL).
- [x] Documentações atualizadas: `README.md` raiz, `backend/README.md`, `mobile/README.md`, `docs/sprints/sprint_3.md` e `docs/PLANO_SPRINTS_TCC2_ZARPA.md`.
