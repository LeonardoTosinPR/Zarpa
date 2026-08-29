# 🚀 ZARPA - Plataforma Inteligente de Intermediação de Entregas Urbanas

> **TCC 2** - Tecnologia em Sistemas para Internet | **UTFPR Câmpus Guarapuava**  
> **Autor**: Leonardo Tosin | **Orientador**: Prof. Dr. Andres Jessé Porfirio  
> **Período**: 25/08/2026 a 31/10/2026  
> **Figma UI/UX**: [Protótipo no Figma](https://www.figma.com/design/TIzcx26iKkfJtdGsidStqD/zarpa-entregas?node-id=4-2&p=f)  

---

## 📌 Visão Geral

O **Zarpa** é uma plataforma que otimiza entregas urbanas em Guarapuava - PR, oferecendo duas modalidades de frete:
1. **Entrega Expressa**: Atendimento imediato sob demanda com radar espacial por proximidade e bloqueio pessimista de concorrência.
2. **Lote Econômico com Rateio Dinâmico 50/50**: Agrupamento noturno de múltiplos pedidos por proximidade geográfica (PostGIS + OpenRouteService), repassando 50% da economia como desconto aos lojistas e 50% como bônus aos entregadores.

---

## 📂 Estrutura do Monorepo

```
/ (raiz do repositório)
├── .github/workflows/        # Pipelines de CI/CD (GitHub Actions)
├── backend/                  # API RESTful em Laravel 13 (PHP 8.3+)
├── mobile/                   # App Mobile React Native com Expo (Expo Router)
│   └── README.md             # Documentação específica da disciplina de Mobile & UI/UX
├── docs/                     # Documentação viva de engenharia (Master Plan, Arquitetura, Sprints)
├── .maestro/                 # Suíte de Testes End-to-End (E2E) em YAML
├── docker-compose.yml        # Orquestração PostgreSQL 16 + PostGIS e Backend
└── README.md
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

Você pode rodar o backend localmente ou via Docker:

#### Opção A: Execução via Docker Compose
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

Consulte o [README do Mobile](file:///d:/Zarpa/mobile/README.md) para detalhes da disciplina de Dispositivos Móveis e protótipo do Figma.

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

# Ou Local
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
Consulte a pasta [`docs/`](file:///d:/Zarpa/docs/) e as documentações específicas dos módulos:
- 📱 [`mobile/README.md`](file:///d:/Zarpa/mobile/README.md): Documentação da disciplina de Desenvolvimento de Projetos para Dispositivos Móveis e Figma.
- 🎨 [Protótipo no Figma](https://www.figma.com/design/TIzcx26iKkfJtdGsidStqD/zarpa-entregas?node-id=4-2&p=f): Telas e fluxos completos de Lojista e Entregador.
- [`MASTER_PLAN.md`](file:///d:/Zarpa/docs/MASTER_PLAN.md): Cronograma executivo de sprints e matriz MoSCoW/RICE.
- [`ARQUITETURA.md`](file:///d:/Zarpa/docs/ARQUITETURA.md): Diagramas de fluxo, arquitetura em camadas e modelo de dados DER.
- [`docs/sprints/sprint_0.md`](file:///d:/Zarpa/docs/sprints/sprint_0.md): Detalhamento da Sprint 0.