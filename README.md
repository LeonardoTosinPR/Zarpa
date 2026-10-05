# 🚀 ZARPA - Plataforma Inteligente de Intermediação de Entregas Urbanas

> **TCC 2** - Tecnologia em Sistemas para Internet | **UTFPR Câmpus Guarapuava**  
> **Autor**: Leonardo Tosin | **Orientador**: Prof. Dr. Andres Jessé Porfirio  
> **Período de Execução**: 25/08/2026 a 31/10/2026  
> **Figma UI/UX**: [Protótipo no Figma](https://www.figma.com/design/TIzcx26iKkfJtdGsidStqD/zarpa-entregas?node-id=4-2&p=f)  
> **Branch da Sprint Atual**: [`sprint/4-lote-economico-agrupamento`](https://github.com/LeonardoTosinPR/Zarpa/tree/sprint/4-lote-economico-agrupamento)

---

## 📚 Módulos e Documentações do Projeto

Navegue diretamente pelos módulos de desenvolvimento e documentações especializadas do monorepo:

| Módulo | Descrição do Componente | Documentação Direta |
| :--- | :--- | :--- |
| 🐘 **Backend (API)** | API RESTful em Laravel 13, PostgreSQL 16 + PostGIS, Sanctum, OSRM e Despacho Expresso | 👉 [**Acessar README Backend**](backend/README.md) |
| 📱 **Mobile (App)** | Aplicativo React Native com Expo SDK 54, Design System do Figma, Radar Expresso e Mapas | 👉 [**Acessar README Mobile**](mobile/README.md) |
| 📐 **Arquitetura** | Especificação arquitetural do sistema, diagramas de fluxo de dados, políticas de segurança e DER Lógico | 👉 [**Acessar ARQUITETURA.md**](docs/ARQUITETURA.md) |
| 📅 **Plano Mestre** | Visão executiva, matriz de rastreabilidade MoSCoW/RICE e cronograma consolidado de todas as sprints | 👉 [**Acessar MASTER_PLAN.md**](docs/MASTER_PLAN.md) |
| ⚡ **Sprint 4 (Atual)** | Lote Econômico, Agrupamento Assíncrono (Batch), PDP e Roteamento Multi-Pontos | 👉 [**Acessar sprint_4.md**](docs/sprints/sprint_4.md) |
| 📦 **Sprint 3** | Fluxo Expresso On-Demand, Radar com Timer de 10s, Lock Pessimista e Rota OSRM | 👉 [**Acessar sprint_3.md**](docs/sprints/sprint_3.md) |
| 🏁 **Sprint 2** | Postagem de Pedidos, Geocodificação OSRM, Mapa Interativo e Cotação de Frete | 👉 [**Acessar sprint_2.md**](docs/sprints/sprint_2.md) |
| 📦 **Sprint 1** | Autenticação, Perfis de Atores (Lojista / Entregador) e Navegação Condicional | 👉 [**Acessar sprint_1.md**](docs/sprints/sprint_1.md) |

---

## 📌 Visão Geral do Sistema

O **Zarpa** é uma plataforma que otimiza entregas urbanas em Guarapuava - PR, integrando backend geoespacial (Laravel 13 + PostgreSQL/PostGIS) e aplicativo móvel multiplataforma (React Native / Expo SDK 54):

1. **Lote Econômico com Rateio Dinâmico (Batch Noturno & On-Demand)**: Agrupamento inteligente de pedidos por proximidade geográfica (PostGIS + OSRM), sequenciamento com precedência estrita ($P_i < D_i$), limites de capacidade física (até 5 pedidos e 20 kg por condutor), rateio 50/50 de economia gerada e tela dedicada no app para consulta de itinerários.
2. **Entrega Expressa On-Demand**: Atendimento imediato sob demanda com radar espacial por proximidade (raio de 1 a 50 km customizável no perfil), timer regressivo de 10s, bloqueio pessimista de concorrência (`lockForUpdate()`) e recusa de chamados com exclusão persistente por condutor.
3. **Módulo de Atores e Perfis**: Segmentação estrita entre Lojista (`client`), Entregador (`courier`) e Administrador (`admin`), com navegação para perfil pelo avatar do cabeçalho global, combo-boxes modais de seleção rápida de raio e veículo, e envio de foto de perfil via galeria do dispositivo.
4. **Geocodificação e Autocomplete Local**: Catálogo determinístico de alta fidelidade para estabelecimentos de Guarapuava (UTFPR, Unicentro CEDETEG, Unicentro Santa Cruz, Shopping, etc.) exibindo título do polo e endereço detalhado.

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
| `.\run.ps1 db:populate` | `./run.sh db:populate` | Executa migrations e popula cenário de teste com entregadores em pólos |
| `.\run.ps1 db:mock-orders` | `./run.sh db:mock-orders` | Popula 70 pedidos mockados aleatórios (20 expressos + 50 econômicos) |
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
