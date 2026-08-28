# SPRINT 0: Setup do Monorepo, Infraestrutura Docker, Base de Testes e Checklist de Ambiente

- **Período**: 25/08/2026 a 01/09/2026 (8 dias)  
- **Branch Git**: `sprint/0-setup-monorepo-infra-testes`  
- **Requisitos Mapeados**: RNF 01 (Persistência Geoespacial), RNF 03 (Compatibilidade Multiplataforma)

---

## 1. Objetivos da Sprint

Estruturar a base do monorepo, disponibilizar o container PostgreSQL 16 com extensão PostGIS ativada, inicializar o scaffold do backend em Laravel 13 com Pest v3, inicializar o app mobile React Native com Expo SDK 54 (compatível com Expo Go) e configurar o fluxo E2E inicial do Maestro com checklist do emulador Android.

---

## 2. Backlog de Tarefas

### 2.1 Raiz do Monorepo, Infraestrutura & Documentação
- [x] Criar estrutura de diretórios `/backend`, `/mobile`, `/.maestro` e `/docs`.
- [x] Estruturar documentação inicial em `/docs`:
  - `docs/MASTER_PLAN.md`
  - `docs/ARQUITETURA.md`
  - `docs/sprints/sprint_0.md`
- [x] Configurar `docker-compose.yml` com serviço `postgres` (`postgis/postgis:16-3.4`) e portas mapeadas (`5432`).
- [x] Atualizar `README.md` raiz com guia de inicialização, variáveis de ambiente e checklist do emulador.

### 2.2 Backend (Laravel 13)
- [x] Inicializar projeto Laravel 13 em `/backend`.
- [x] Configurar `.env.example` e `.env` para conexão com PostgreSQL/PostGIS.
- [x] Criar migration inicial para habilitação da extensão `CREATE EXTENSION IF NOT EXISTS postgis;`.
- [x] Configurar rota `/api/health` para verificação de status e conexão com banco.
- [x] Configurar Pest v3 e criar teste de sanidade com banco de dados.

### 2.3 Mobile (React Native / Expo)
- [x] Inicializar projeto React Native com Expo (TypeScript + Expo Router) em `/mobile`.
- [x] Instalar dependências essenciais:
  - `react-native-maps`
  - `axios` / `@tanstack/react-query`
  - `expo-secure-store`
  - `expo-location`
- [x] Configurar suíte de testes com Jest e React Native Testing Library (RNTL).

### 2.4 Testes End-to-End (Maestro) & Checklist do Emulador
- [x] Criar `/.maestro/healthcheck.yaml` verificando inicialização do app.
- [x] Validar fluxo no dispositivo móvel via Expo Go (Tunnel) e documentar checklist do emulador Android.

---

## 3. Definition of Done (DoD)

- [x] Container Docker de PostgreSQL com PostGIS rodando saudavelmente.
- [x] Backend respondendo a `/api/health` e executando `php artisan test` (Pest) com 100% de sucesso.
- [x] App mobile Expo executando localmente e com testes Jest passando.
- [x] Fluxo `healthcheck.yaml` do Maestro estruturado e documentado.
- [x] Branch `sprint/0-setup-monorepo-infra-testes` pronta com commits convencionais.

