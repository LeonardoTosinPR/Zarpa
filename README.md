# 🚀 ZARPA - Plataforma Inteligente de Intermediação de Entregas Urbanas

> **Trabalho de Conclusão de Curso (TCC 2)**  
> **Curso**: Tecnologia em Sistemas para Internet | **Instituição**: Universidade Tecnológica Federal do Paraná (UTFPR) – Câmpus Guarapuava  
> **Autor**: Leonardo Tosin | **Orientador**: Prof. Dr. Andres Jessé Porfirio  
> **Período**: 25/08/2026 a 31/10/2026  

---

## 📌 O que é o Zarpa?

O **Zarpa** é uma plataforma inteligente de intermediação e otimização logística urbana projetada para conectar o **comércio local (lojistas)** a **entregadores autônomos**, tendo como laboratório de validação inicial a malha viária do município de **Guarapuava - PR**.

A plataforma resolve dois dos maiores gargalos das entregas locais: o alto custo de fretes individuais para pequenos lojistas e a remuneração achatada por quilometragem excessiva enfrentada pelos entregadores.

```
                  ┌────────────────────────────────────────────────────────┐
                  │                    PLATAFORMA ZARPA                    │
                  │   (API Laravel 13 + PostGIS + App Expo React Native)   │
                  └───────────────────────────┬────────────────────────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
       ⚡ MODALIDADE EXPRESSA                             📦 LOTE ECONÔMICO (BATCH)
  ┌─────────────────────────────────┐                 ┌─────────────────────────────────┐
  │ • Demanda em tempo real         │                 │ • Consolidação de pedidos       │
  │ • Radar espacial por raio (km)  │                 │ • Clusterização geoespacial     │
  │ • Trava pessimista anti-conflito│                 │ • Rota multi-pontos ótima (ORS) │
  │ • Despacho imediato             │                 │ • Rateio Colaborativo 50/50     │
  └─────────────────────────────────┘                 └─────────────────────────────────┘
```

---

## 💡 Proposta de Valor e Modalidades de Frete

O Zarpa opera com **dois modelos complementares de frete**:

### 1. ⚡ Entrega Expressa (On-Demand)
- **Foco**: Pedidos urgentes com atendimento imediato.
- **Funcionamento**: O lojista cadastra o pedido e o sistema dispara um **radar geoespacial** por raio de proximidade utilizando queries espaciais (`PostGIS`).
- **Segurança Transacional**: Emprega controle de concorrência com **bloqueio pessimista** (`lockForUpdate`), garantindo que apenas um entregador consiga aceitar a corrida em tempo real, eliminando *race conditions*.

### 2. 📦 Lote Econômico com Rateio Dinâmico 50/50 (O Grande Diferencial)
- **Foco**: Entregas programadas e não urgentes com foco em eficiência de custo e rota.
- **Funcionamento**: Ao longo do expediente, pedidos são agrupados por proximidade geográfica via algoritmos espaciais e integração com **OpenRouteService (ORS)**, gerando rotas multi-paradas otimizadas.
- **Mecanismo de Rateio 50/50**:
  - Calcula-se o custo base somado dos fretes como se cada pedido fosse entregue de forma individual e isolada ($C_{individual}$).
  - Calcula-se o custo real da rota otimizada consolidada ($C_{lote}$).
  - A economia gerada ($\Delta E = C_{individual} - C_{lote}$) é rateada de forma justa e transparente:
    - **50% da economia** é devolvida aos lojistas na forma de desconto percentual sobre o valor do frete.
    - **50% da economia** é convertida em bônus financeiro de produtividade para o entregador responsável pela rota agrupada.

---

## 👥 Atores do Sistema

| Ator | Funcionalidades Principais no Aplicativo |
| :--- | :--- |
| 🏪 **Lojista (Cliente)** | • Postagem ágil de pedidos com geocodificação automática de endereço.<br>• Escolha entre entrega **Expressa** ou inclusão no **Lote Econômico**.<br>• Acompanhamento do status de entrega em tempo real no mapa.<br>• Extrato de pedidos com visualização clara do desconto auferido por rateio. |
| 🛵 **Entregador (Courier)** | • Radar de oportunidades expressas nas proximidades.<br>• Agenda de lotes econômicos atribuídos com rota sequencial multi-pontos.<br>• Transbordamento para navegação externa nativa (Google Maps / Waze).<br>• Extrato financeiro transparente com detalhamento de corridas e bônus de rateio. |

---

## 🛠️ Stack Tecnológica

### Backend & Dados
- **Framework**: [Laravel 13](https://laravel.com/) (PHP 8.3+)
- **Banco de Dados**: [PostgreSQL 16](https://www.postgresql.org/) com extensão espacial **[PostGIS](https://postgis.net/)** (`SRID 4326` e índices espaciais `GIST`)
- **Autenticação**: Laravel Sanctum com perfis segregados (`client`, `courier`, `admin`)
- **Serviços Geoespaciais & Roteamento**: [OpenRouteService (ORS)](https://openrouteservice.org/) (Geocoding Pelias, Directions e Matrix API)
- **Testes Automatizados**: [Pest PHP v3](https://pestphp.com/) (Feature e Unit Tests)

### Frontend Mobile
- **Framework**: [React Native](https://reactnative.dev/) com [Expo SDK 54](https://expo.dev/) (Expo Router baseado em arquivos)
- **Linguagem**: TypeScript
- **Gerenciamento de Estado & Cache**: TanStack React Query + Axios
- **Mapas & GPS**: `react-native-maps`, `expo-location` e deep linking com Google Maps / Waze
- **Armazenamento Seguro**: `expo-secure-store`
- **Testes Automatizados**: Jest + React Native Testing Library (RNTL)

### Qualidade & E2E
- **Testes End-to-End**: [Maestro](https://maestro.mobile.dev/)
- **Integração Contínua (CI)**: GitHub Actions rodando linters, testes de backend e frontend em todo PR e push.

---

## 📂 Estrutura do Monorepo

```
/ (raiz do repositório)
├── .github/workflows/        # Pipelines de CI/CD (GitHub Actions)
├── backend/                  # API RESTful em Laravel 13 (PHP 8.3+)
│   ├── app/                  # Controllers, Models, Services, Policies, Jobs
│   ├── database/             # Migrations com suporte a PostGIS, Seeders, Factories
│   ├── routes/               # Rotas da API (/api/v1)
│   └── tests/                # Testes automatizados com Pest v3
├── mobile/                   # App Mobile React Native com Expo (Expo Router)
│   ├── app/                  # Rotas e Telas (Lojista / Entregador)
│   ├── src/                  # Componentes, Hooks, Services e Tipos TypeScript
│   └── __tests__/            # Testes unitários Jest / RNTL
├── docs/                     # Documentação viva de engenharia de software
│   ├── MASTER_PLAN.md        # Cronograma executivo de sprints e matriz MoSCoW/RICE
│   ├── ARQUITETURA.md        # Arquitetura em camadas, diagramas de fluxo e DER
│   └── sprints/              # Especificações granulares por sprint
├── .maestro/                 # Suíte de Testes End-to-End (E2E) em YAML
├── docker-compose.yml        # Orquestração PostgreSQL 16 + PostGIS e Backend
└── README.md                 # Visão geral e guia de inicialização
```

---

## ⚡ Guia Rápido de Inicialização

### 1. Pré-requisitos
- [Docker](https://www.docker.com/) e Docker Compose
- [Node.js](https://nodejs.org/) (v20+ ou v22 LTS) e npm
- [Expo CLI](https://docs.expo.dev/) / Expo Go no dispositivo físico ou Emulador Android com Google Play Services

---

### 2. Infraestrutura e Banco de Dados (PostgreSQL 16 + PostGIS)

Suba o container com o banco geoespacial:
```bash
docker compose up -d postgres
```

Para verificar o status dos containers:
```bash
docker compose ps
```

---

### 3. Backend (Laravel 13)

Você pode rodar o backend via Docker ou localmente:

#### Opção A: Execução via Docker Compose (Recomendado)
```bash
docker compose up -d backend
docker compose exec backend php artisan migrate
docker compose exec backend php artisan test
```

#### Opção B: Execução Local
```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan serve
```

A API estará disponível em: `http://localhost:8000/api/health`

---

### 4. Mobile (React Native / Expo SDK 54)

```bash
cd mobile
npm install
npx expo start
```
- Pressione `a` para abrir no **Emulador Android**;
- Ou escaneie o QR Code no aplicativo **Expo Go** em seu smartphone (Android/iOS).

---

## 🧪 Execução de Testes Automatizados

### Backend (Pest v3)
```bash
# Via Docker
docker compose exec backend php artisan test

# Ou Localmente
cd backend
php artisan test
```

### Mobile (Jest + React Native Testing Library)
```bash
cd mobile
npm test
```

### End-to-End (Maestro)
Com o emulador Android ativo e o app instalado:
```bash
maestro test .maestro/healthcheck.yaml
```

---

## 📋 Checklist do Emulador Android
- [ ] Android SDK configurado (`ANDROID_HOME` e variáveis em `$PATH`);
- [ ] Pelo menos 1 AVD configurado (`emulator -list-avds`) com imagem Google Play APIs (Android 14/15);
- [ ] Dispositivo reconhecido pelo ADB (`adb devices`).

---

## 📄 Documentação Completa
Consulte os documentos detalhados na pasta [`docs/`](file:///d:/Zarpa/docs/):
- [`MASTER_PLAN.md`](file:///d:/Zarpa/docs/MASTER_PLAN.md): Cronograma executivo de sprints e matriz MoSCoW/RICE.
- [`ARQUITETURA.md`](file:///d:/Zarpa/docs/ARQUITETURA.md): Diagramas de fluxo, arquitetura em camadas e modelo de dados DER.
- [`docs/sprints/sprint_0.md`](file:///d:/Zarpa/docs/sprints/sprint_0.md): Detalhamento da Sprint 0.
