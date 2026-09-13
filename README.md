# 🚀 ZARPA - Plataforma Inteligente de Intermediação de Entregas Urbanas

> **TCC 2** - Tecnologia em Sistemas para Internet | **UTFPR Câmpus Guarapuava**  
> **Autor**: Leonardo Tosin | **Orientador**: Prof. Dr. Andres Jessé Porfirio  
> **Período de Execução**: 25/08/2026 a 31/10/2026  
> **Figma UI/UX**: [Protótipo no Figma](https://www.figma.com/design/TIzcx26iKkfJtdGsidStqD/zarpa-entregas?node-id=4-2&p=f)  
> **Sprint Atual**: **Sprint 1 - Módulo de Atores, Autenticação e Perfis Isolados** (`sprint/1-auth-perfis-atores`)

---

## 📌 Visão Geral do Sistema

O **Zarpa** é uma plataforma que otimiza entregas urbanas em Guarapuava - PR, integrando backend geoespacial (Laravel 13 + PostgreSQL/PostGIS) e aplicativo móvel multiplataforma (React Native / Expo SDK 54):

1. **Entrega Expressa**: Atendimento imediato sob demanda com radar espacial por proximidade e bloqueio pessimista de concorrência (`lockForUpdate()`).
2. **Lote Econômico com Rateio Dinâmico 50/50**: Agrupamento noturno de pedidos por proximidade geográfica (PostGIS + OpenRouteService), repassando 50% da economia como desconto aos lojistas e 50% como bônus aos entregadores.
3. **Módulo de Atores e Perfis**: Segmentação estrita entre Lojista (`client`), Entregador (`courier`) e Administrador (`admin`) com autenticação via Laravel Sanctum e armazenamento seguro em `expo-secure-store`.

---

## 📂 Estrutura do Monorepo

```
/ (raiz do repositório)
├── .github/workflows/        # Pipelines de CI/CD (GitHub Actions)
├── backend/                  # API RESTful em Laravel 13 (PHP 8.3+) + PostGIS + Sanctum
├── mobile/                   # App Mobile React Native com Expo SDK 54 (Expo Router)
├── docs/                     # Documentação viva de engenharia
│   ├── MASTER_PLAN.md        # Visão executiva e matriz MoSCoW/RICE
│   ├── ARQUITETURA.md        # Especificação arquitetural, fluxos e DER
│   └── sprints/              # Detalhamento granular das sprints (sprint_0.md, sprint_1.md...)
├── run.ps1 / run.sh          # ⚡ CLI Unificado de Gerenciamento do Projeto
├── .maestro/                 # Suíte de Testes End-to-End (E2E) em YAML
├── docker-compose.yml        # Orquestração PostgreSQL 16 + PostGIS e Backend
└── README.md
```

---

## ⚡ CLI Unificado de Gerenciamento (`run.ps1` / `run.sh`)

O projeto conta com um script único e inteligente para gerenciar todo o ciclo de desenvolvimento, diagnósticos e testes:

| Comando PowerShell | Comando Bash / WSL | Ação Executada |
| :--- | :--- | :--- |
| `.\run.ps1 dev` | `./run.sh dev` | Sobe Docker (PostGIS + Backend) e inicia o Expo Mobile |
| `.\run.ps1 up` | `./run.sh up` | Sobe os containers Docker em segundo plano (`-d`) |
| `.\run.ps1 down` | `./run.sh down` | Para e remove os containers Docker |
| `.\run.ps1 restart` | `./run.sh restart` | Reinicia todos os containers Docker |
| `.\run.ps1 mobile` | `./run.sh mobile` | Inicia apenas o servidor Expo Mobile |
| `.\run.ps1 db:populate` | `./run.sh db:populate` | Executa migrations e popula usuários de teste |
| `.\run.ps1 db:reset` | `./run.sh db:reset` | Reseta o banco (`migrate:fresh`) e repopula |
| `.\run.ps1 test` | `./run.sh test` | Executa todos os testes (Pest + Jest + TypeScript) |
| `.\run.ps1 test:backend` | `./run.sh test:backend`| Executa testes do backend Laravel (Pest v3) |
| `.\run.ps1 test:mobile` | `./run.sh test:mobile` | Executa testes unitários do mobile (Jest) |
| `.\run.ps1 test:e2e` | `./run.sh test:e2e` | Executa testes End-to-End com Maestro |
| `.\run.ps1 diagnostic` | `./run.sh diagnostic` | Diagnóstico do Docker Desktop, WSL2 e Node.js |
| `.\run.ps1 users` | `./run.sh users` | Exibe credenciais das contas de teste |
| `.\run.ps1 help` | `./run.sh help` | Exibe o menu completo de ajuda |

---

## 🔑 Usuários de Teste Pré-Configurados (Sprint 1)

| Perfil | E-mail | Senha | Detalhes no Sistema |
| :--- | :--- | :--- | :--- |
| 👑 **Admin Master** | `admin@zarpa.com.br` | `admin123456` | Acesso total e alternância entre painéis |
| 🏪 **Lojista Teste** | `lojista@zarpa.com.br` | `lojista123456` | *Padaria Central Guarapuava* (CNPJ `12.345.678/0001-90`) |
| 🛵 **Entregador Teste** | `entregador@zarpa.com.br` | `entregador123456` | *Carlos Motoboy* (Moto Honda CG 160, Placa `BRA2E19`) |

> 💡 **Atalho no App**: Na tela de Boas-Vindas e Login do App Mobile, você pode clicar nos botões de atalho rápido (**[👑 Admin]**, **[🏪 Lojista]** ou **[🛵 Entregador]**) para entrar instantaneamente sem digitar credenciais.

---

## 📄 Documentação de Engenharia
- 📱 [`mobile/README.md`](file:///d:/Zarpa/mobile/README.md): Especificação de Mobile & UI/UX Figma.
- 🎨 [Protótipo no Figma](https://www.figma.com/design/TIzcx26iKkfJtdGsidStqD/zarpa-entregas?node-id=4-2&p=f): Design System e fluxos de telas.
- [`MASTER_PLAN.md`](file:///d:/Zarpa/docs/MASTER_PLAN.md): Visão executiva e cronograma das sprints.
- [`ARQUITETURA.md`](file:///d:/Zarpa/docs/ARQUITETURA.md): Arquitetura de software, DER e diagramas de fluxo.
- [`docs/sprints/sprint_1.md`](file:///d:/Zarpa/docs/sprints/sprint_1.md): Detalhamento e DoD da Sprint 1.
