# 🚀 ZARPA - Plataforma Inteligente de Intermediação de Entregas Urbanas

> **TCC 2** - Tecnologia em Sistemas para Internet | **UTFPR Câmpus Guarapuava**  
> **Autor**: Leonardo Tosin | **Orientador**: Prof. Dr. Andres Jessé Porfirio  
> **Período de Execução**: 25/08/2026 a 31/10/2026  
> **Figma UI/UX**: [Protótipo no Figma](https://www.figma.com/design/TIzcx26iKkfJtdGsidStqD/zarpa-entregas?node-id=4-2&p=f)  
> **Branch da Sprint Atual**: [`sprint/1-auth-perfis-atores`](https://github.com/LeonardoTosinPR/Zarpa/tree/sprint/1-auth-perfis-atores)

---

## 📚 Módulos e Documentações do Projeto

Navegue diretamente pelos módulos de desenvolvimento e documentações especializadas do monorepo:

| Módulo | Descrição do Componente | Documentação Direta |
| :--- | :--- | :--- |
| 📱 **Mobile (App)** | Aplicativo React Native com Expo SDK 54, Design System do Figma, DER e Checkpoints da disciplina de Dispositivos Móveis | 👉 [**Acessar README Mobile**](mobile/README.md) |
| 🐘 **Backend (API)** | API RESTful em Laravel 13, PostgreSQL 16 + PostGIS, Laravel Sanctum e motor de roteamento ORS | 👉 [**Acessar README Backend**](backend/README.md) *(Em breve)* |
| 📐 **Arquitetura** | Especificação arquitetural do sistema, diagramas de fluxo de dados, políticas de segurança e DER Lógico | 👉 [**Acessar ARQUITETURA.md**](docs/ARQUITETURA.md) |
| 📅 **Plano Mestre** | Visão executiva, matriz de rastreabilidade MoSCoW/RICE e cronograma consolidado de todas as sprints | 👉 [**Acessar MASTER_PLAN.md**](docs/MASTER_PLAN.md) |
| 🏁 **Sprint 1 (Atual)** | Especificação de requisitos, backlog técnico, endpoints de autenticação e Definition of Done (DoD) | 👉 [**Acessar sprint_1.md**](docs/sprints/sprint_1.md) |

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
│   └── README.md             # 📱 Documentação Completa do Mobile & Checkpoint 1
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
| `.\run.ps1 diagnostic` | `./run.sh diagnostic` | Diagnóstico do Docker, serviços e Node.js |
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
