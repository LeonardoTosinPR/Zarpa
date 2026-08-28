# MASTER PLAN - PROJETO ZARPA (TCC 2)

**Projeto**: ZARPA: Plataforma Inteligente para Intermediação de Entregas Urbanas com Otimização Colaborativa de Rotas e Redistribuição Dinâmica de Frete  
**Autor**: Leonardo Tosin  
**Orientador**: Prof. Dr. Andres Jessé Porfirio  
**Instituição**: Universidade Tecnológica Federal do Paraná (UTFPR) – Câmpus Guarapuava  
**Curso**: Tecnologia em Sistemas para Internet  
**Período de Execução do Desenvolvimento**: 25/08/2026 a 31/10/2026 (~67 dias / 9,5 semanas)  

---

## 1. Visão Executiva e Objetivos

O projeto Zarpa consiste no desenvolvimento de uma solução integrada (API RESTful + Aplicativo Mobile) que viabiliza a intermediação logística inteligente de entregas urbanas no município de Guarapuava (PR). A plataforma introduz o conceito de **Lote Econômico com Rateio Dinâmico 50/50**, permitindo que lojistas compartilhem custos de rotas geradas de forma otimizada via algoritmos geoespaciais (PostGIS + OpenRouteService) e entregadores recebam bônus de produtividade sem sobrecarga de quilometragem.

---

## 2. Estrutura do Monorepo

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
│   └── sprints/              # Detalhamento granular de cada sprint
│       ├── sprint_0.md       # Especificação detalhada da Sprint 0
│       ├── sprint_1.md       # Especificação detalhada da Sprint 1
│       └── ...
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

---

## 3. Matriz de Requisitos (MoSCoW / RICE)

| ID | Tipo | Descrição Resumida | Prioridade | Score RICE | Sprint Responsável |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF 01** | Funcional | Cadastro e Autenticação de Usuários (Lojista / Entregador) | Must Have | 6000 | Sprint 1 |
| **RF 02** | Funcional | Interface de Postagem de Pedidos com Cubagem/Peso | Must Have | 1800 | Sprint 2 |
| **RF 03** | Funcional | Geocodificação de Endereços (Texto -> Coordenadas) | Must Have | 2700 | Sprint 2 |
| **RF 04** | Funcional | Algoritmo de Lote Econômico (Batch Noturno) | Must Have | 1600 | Sprint 4 |
| **RF 05** | Funcional | Integração ORS (Roteamento Viário e Distâncias) | Must Have | 2400 | Sprint 3 & Sprint 4 |
| **RF 06** | Funcional | Módulo de Rateio Financeiro Dinâmico (50/50) | Must Have | 1200 | Sprint 5 |
| **RF 07** | Funcional | Controle de Concorrência Transacional (Pessimistic Lock) | Must Have | 1800 | Sprint 3 |
| **RF 08** | Funcional | Painel / Agenda de Tarefas do Entregador | Must Have | 2000 | Sprint 6 |
| **RF 09** | Funcional | Atualização Manual de Status do Ciclo de Vida | Must Have | 6000 | Sprint 6 |
| **RF 10** | Funcional | Notificações Push / Radar Imediato (Expressa) | Should Have | 1067 | Sprint 3 |
| **RF 11** | Funcional | Extrato e Histórico Simplificado de Ganhos/Descontos | Should Have | 1400 | Sprint 5 |
| **RF 12** | Funcional | Transbordamento para Navegação Externa (Google Maps / Waze) | Could Have | 2000 | Sprint 6 |
| **RNF 01** | Não-Func. | Persistência Geoespacial (PostGIS, latência < 1.5s) | Must Have | - | Sprint 0, 2, 4 |
| **RNF 02** | Não-Func. | Segurança Transacional em Concorrência Concorrente | Must Have | - | Sprint 3 |
| **RNF 03** | Não-Func. | Compatibilidade Multiplataforma (React Native / Expo SDK 54) | Must Have | - | Sprint 0, 1 a 7 |
| **RNF 04** | Não-Func. | Desempenho do Motor de Roteamento ORS (< 2.5s) | Must Have | - | Sprint 3, 4 |

---

## 4. Cronograma Consolidado das Sprints

| Sprint | Período | Branch Obrigatória | Foco Temático Principal |
| :--- | :--- | :--- | :--- |
| **Sprint 0** | 25/08 a 01/09/2026 | `sprint/0-setup-monorepo-infra-testes` | Fundação do Monorepo, Docker PostGIS, Testes (Pest/Jest/Maestro) & Checklist Emulador |
| **Sprint 1** | 02/09 a 09/09/2026 | `sprint/1-auth-perfis-atores` | Autenticação, Perfis de Atores e Navegação Condicional |
| **Sprint 2** | 10/09 a 17/09/2026 | `sprint/2-postagem-geocodificacao-pedidos` | Postagem de Pedidos, Geocodificação ORS e Visualização em Mapa |
| **Sprint 3** | 18/09 a 25/09/2026 | `sprint/3-fluxo-expresso-concorrencia` | Fluxo Expresso On-Demand, Radar e Trava Pessimista de Concorrência |
| **Sprint 4** | 26/09 a 04/10/2026 | `sprint/4-lote-economico-agrupamento` | Lote Econômico Assíncrono (Batch), Clusterização e Roteamento Multi-Pontos |
| **Sprint 5** | 05/10 a 13/10/2026 | `sprint/5-rateio-dinamico-extratos` | Motor de Rateio Financeiro 50/50 e Painéis de Extrato Transparente |
| **Sprint 6** | 14/10 a 22/10/2026 | `sprint/6-execucao-rotas-status-navegacao` | Execução Operacional de Rotas, Ciclo de Vida e Transbordamento GPS |
| **Sprint 7** | 23/10 a 31/10/2026 | `sprint/7-validacao-cenarios-reais-homologacao` | Validação Integrada com Rotas de Guarapuava, Regressão E2E e Homologação Final |

