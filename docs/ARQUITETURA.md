# ARQUITETURA DE SOFTWARE DO PROJETO ZARPA

## 1. Visão Geral da Arquitetura

O sistema Zarpa é desenhado sob o padrão arquitetural em camadas com separação clara entre cliente (Mobile React Native com Expo) e servidor (API RESTful em Laravel 13 com persistência relacional e geoespacial no PostgreSQL/PostGIS).

```mermaid
graph TD
    subgraph Mobile ["Frontend Mobile (Expo SDK 54 / React Native)"]
        UI["Expo Router / Telas (Lojista & Entregador)"]
        State["TanStack React Query & AuthContext"]
        NativeMap["OpenStreetMap Engine (Mercator Tiles, Radar & Markers)"]
        GPS["Expo Location & Deep Link (Google Maps / Waze)"]
    end

    subgraph API ["Backend API (Laravel 13 - PHP 8.3+)"]
        Router["Rotas /api/v1"]
        Sanctum["Laravel Sanctum (Auth & Tokens)"]
        Controllers["Controllers (Orders, Dispatch, Statement, Batch)"]
        Services["Services (Geocoding, ORS Route, Clustering, Apportionment)"]
        Lock["Pessimistic Lock (lockForUpdate)"]
    end

    subgraph Storage ["Camada de Dados & Serviços Externos"]
        Postgres[("PostgreSQL 16 + PostGIS")]
        OSRM["Servidor OSRM Dedicado (osrmcar.debug.app.br / Basic Auth)"]
        Geocoding["Serviço de Geocodificação (Nominatim / Pelias / Fallback Local)"]
    end

    UI --> State
    State -->|HTTP / JSON + Bearer Token| Router
    Router --> Sanctum
    Sanctum --> Controllers
    Controllers --> Services
    Services --> Lock
    Lock --> Postgres
    Services -->|HTTP Basic Auth| OSRM
    Services -->|HTTP REST| Geocoding
    UI --> NativeMap
    UI --> GPS
```

---

## 2. Componentes e Tecnologias

### 2.1 Backend (Laravel 13)
- **Framework**: Laravel 13 (PHP 8.3+).
- **Autenticação**: Laravel Sanctum com tokens de acesso pessoal e Policies por perfil (`client`, `courier`, `admin`).
- **Persistência**: PostgreSQL 16 + PostGIS (armazenamento de coordenadas geográficas `SRID 4326` com indexação espacial `GIST`).
- **Concorrência**: Controle transacional com bloqueio pessimista (`lockForUpdate()`) para disputa do Radar Expresso.
- **Roteamento Viário**: Integração HTTP com servidor OSRM próprio (`https://osrmcar.debug.app.br`) via Basic Auth.
- **Testes**: Pest v3 (Unit e Feature tests).

### 2.2 Frontend Mobile (React Native / Expo SDK 54)
- **Framework**: Expo SDK 54 com Expo Router (sistema de rotas baseado em arquivos).
- **Linguagem**: TypeScript.
- **Gerenciamento de Estado de Rede**: `@tanstack/react-query` e `axios`.
- **Armazenamento Seguro**: `expo-secure-store` para tokens JWT/Sanctum.
- **Mapas e Geolocalização**: Motor nativo em React Native puro consumindo API de azulejos do **OpenStreetMap (OSM)** com projeção Mercator determinística (eliminando dependência de SDKs proprietários/pagos do Google Maps) e `expo-location`.
- **Testes**: Jest + React Native Testing Library (RNTL).

### 2.3 Integrações Externas e Geoespaciais
- **Servidor OSRM Dedicado (`https://osrmcar.debug.app.br`)**:
  - Servidor próprio configurado para roteamento viário e cálculo de distâncias reais na malha urbana de Guarapuava - PR.
  - Autenticação: **HTTP Basic Auth** (configurado via variáveis de ambiente `OSRM_USERNAME` e `OSRM_PASSWORD`).
  - Endpoint principal: `GET /route/v1/driving/{coordinates}?steps=true&overview=full&geometries=polyline`.
  - Retorno: Distância precisa em metros, duração estimada em segundos e geometria da rota (Polyline) para renderização cartográfica.
- **Serviço de Geocodificação (`GeocodingService`)**:
  - Conversão de endereços textuais para coordenadas (lat/lng) com foco na área urbana de Guarapuava - PR.
  - Suporte a provedor Nominatim/Pelias com dicionário geográfico local de alta precisão (bairros e pontos de referência de Guarapuava) para garantia de disponibilidade nos testes unitários e E2E.
- **Navegação Nativa Externa**: Deep links para Google Maps (`geo:lat,lng`) e Waze (`waze://?ll=lat,lng&navigate=yes`).

---

## 3. Modelo de Dados Geográfico (DER Lógico)

```mermaid
erDiagram
    USERS ||--o| CLIENTS : "has one"
    USERS ||--o| COURIERS : "has one"
    CLIENTS ||--o{ ORDERS : "places"
    COURIERS ||--o{ ORDERS : "delivers (express)"
    COURIERS ||--o{ DELIVERY_GROUPS : "assigned to"
    DELIVERY_GROUPS ||--o{ GROUP_ORDERS : "contains"
    ORDERS ||--o| GROUP_ORDERS : "linked to"

    USERS {
        bigint id PK
        string name
        string email UK
        string password
        string role
        string phone
        timestamp created_at
    }

    CLIENTS {
        bigint id PK
        bigint user_id FK
        string business_name
        string cnpj_cpf
        string default_address
        geometry default_location "Point(4326)"
    }

    COURIERS {
        bigint id PK
        bigint user_id FK
        string cnh
        string vehicle_type
        string vehicle_plate
        geometry current_location "Point(4326)"
        decimal cluster_radius_km
        boolean is_online
        boolean is_active
    }

    ORDERS {
        bigint id PK
        bigint client_id FK
        bigint courier_id FK "nullable"
        string origin_address
        geometry origin_location "Point(4326)"
        string dest_address
        geometry dest_location "Point(4326)"
        string package_description
        decimal package_weight_kg
        decimal package_volume_m3
        string shipping_type "express / economic"
        string status "pending / assigned / picked_up / delivered / canceled"
        boolean is_anchor
        decimal individual_freight_price
        decimal final_freight_price
        string proof_photo_url
        timestamp delivered_at
    }

    DELIVERY_GROUPS {
        bigint id PK
        bigint courier_id FK
        date scheduled_date
        decimal total_distance_km
        int total_duration_minutes
        string status "created / in_progress / completed"
        decimal total_combined_cost
        decimal total_savings_generated
        decimal courier_bonus
    }

    GROUP_ORDERS {
        bigint id PK
        bigint delivery_group_id FK
        bigint order_id FK
        int stop_sequence
        string stop_type "pickup / delivery"
        decimal isolated_distance_km
        decimal shared_distance_km
        decimal allocated_cost
        decimal merchant_discount
    }
```

---

## 4. Regra Matemática do Rateio Dinâmico 50/50

A economia total gerada pelo agrupamento de rotas em lote é calculada comparando a soma das distâncias individuais isoladas com a distância real consolidada do lote:

$$D_{isolada} = \sum_{i=1}^{n} d_i$$

$$E_{total} = (D_{isolada} \times \text{tarifa\_km}) - (D_{conjunta} \times \text{tarifa\_km})$$

A distribuição ocorre em proporção exata 50/50:
1. **Bônus de Produtividade do Entregador (50%)**:
   $$B_{courier} = E_{total} \times 0.50$$
2. **Desconto Compartilhado dos Lojistas (50%)**, rateado ponderadamente:
   $$\text{Desconto}_i = (E_{total} \times 0.50) \times \left( \frac{d_i}{D_{isolada}} \right)$$

