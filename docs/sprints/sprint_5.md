# SPRINT 5: Motor de Rateio Dinâmico 50/50 e Extratos Financeiros

- **Período**: 05/10/2026 a 13/10/2026 (9 dias)
- **Branch Git**: `sprint/5-rateio-dinamico-extratos`
- **Requisitos Mapeados**:
  - **RF 06**: Módulo de Rateio Financeiro Dinâmico (50/50) (Must Have, RICE 1200)
  - **RF 11**: Extrato e Histórico Simplificado de Ganhos/Descontos (Should Have, RICE 1400)
  - **RNF 01**: Persistência e Integridade Transacional (PostgreSQL/PostGIS)
  - **RNF 03**: Compatibilidade Multiplataforma (Expo SDK 54 / Expo Go)

---

## 1. Objetivos da Sprint

Implementar a tese central do modelo econômico do Zarpa: o **Motor de Rateio Cooperativo de Frete (50/50)** e a visualização transparente de extratos financeiros para ambos os atores da plataforma (**Lojista** e **Entregador**).

Ao agrupar múltiplos pedidos econômicos em uma rota única otimizada, a quilometragem total conjunta percorrida ($D_{conjunta}$) é substancialmente menor do que o somatório dos deslocamentos se cada entrega fosse realizada isoladamente de forma ponto a ponto ($D_{isolada}$).

A economia bruta gerada por essa convergência logística ($E_{total}$) é repartida equitativamente pelo sistema:
1. **50% revertido como Bônus de Produtividade ao Entregador ($B_{courier}$)**: Recompensa o condutor parceiro por realizar entregas consolidadas em sequência, aumentando expressivamente seu rendimento financeiro por quilômetro rodado ($R\$/km$).
2. **50% devolvido como Desconto Retroativo Proporcional aos Lojistas ($D_{clientes}$)**: Rateado entre os estabelecimentos participantes na proporção exata da quilometragem original de cada pedido em relação à distância total isolada do lote.

Ambos os atores passam a contar com telas dedicadas de **Extrato Financeiro Transparente** no aplicativo mobile, evidenciando o valor original do frete versus o valor final com desconto colaborativo (Lojista) e os ganhos base somados aos bônus de lote com indicador de eficiência em $R\$/km$ (Entregador).

---

## 2. Modelagem Matemática do Rateio 50/50

### 2.1 Formulação Algorítmica (`DynamicApportionmentService`)

Seja um lote econômico composto por $n$ pedidos $\{O_1, O_2, \dots, O_n\}$, onde cada pedido $O_i$ possui distância viária isolada $d_i$ e valor de frete individual pré-cotado $P_i$.

1. **Distância Total Isolada ($D_{isolada}$)**:
   $$D_{isolada} = \sum_{i=1}^n d_i$$

2. **Distância Real Conjunta ($D_{conjunta}$)**:
   Distância viária obtida pela rota contínua com todas as coletas e entregas sequenciadas pelo algoritmo de PDP (Pickup and Delivery Problem) via OSRM.

3. **Economia de Distância ($\Delta D$)**:
   $$\Delta D = \max(0, D_{isolada} - D_{conjunta})$$

4. **Economia Financeira Bruta ($E_{total}$)**:
   $$E_{total} = \Delta D \times T_{km}$$
   *(Onde $T_{km} = R\$ 2,50$ é a tarifa viária regulamentar por km rodado em Guarapuava).*

5. **Divisão Cooperativa 50/50**:
   - **Bônus do Entregador ($B_{courier}$)**:
     $$B_{courier} = \text{round}(E_{total} \times 0.50, 2)$$
   - **Desconto Global dos Lojistas ($D_{clientes}$)**:
     $$D_{clientes} = \text{round}(E_{total} \times 0.50, 2)$$

6. **Rateio Proporcional Individual por Lojista**:
   Para cada pedido $i \in \{1, \dots, n\}$:
   $$w_i = \frac{d_i}{D_{isolada}}$$
   $$\text{Desconto}_i = \text{round}(D_{clientes} \times w_i, 2)$$

7. **Garantia de Conservação Contábil e Correção de Resíduos**:
   Para eliminar discrepâncias decorrentes de arredondamentos decimais monetários:
   $$\text{Resíduo} = D_{clientes} - \sum_{i=1}^n \text{Desconto}_i$$
   O resíduo (centavos sobressalentes) é alocado deterministicamente ao pedido com maior distância individual, assegurando que:
   $$\sum_{i=1}^n \text{Desconto}_i \equiv D_{clientes}$$

8. **Preço Final de Frete Cobrado do Lojista**:
   $$\text{Preço Final}_i = \text{round}(P_i - \text{Desconto}_i, 2)$$

### 2.2 Cenário de Referência do TCC (Caso Simulado 16 km vs 11 km)
- **Pedidos do Lote**:
  - $O_1$: $d_1 = 5{,}0\text{ km}$, $P_1 = R\$ 18{,}50$
  - $O_2$: $d_2 = 6{,}0\text{ km}$, $P_2 = R\$ 21{,}00$
  - $O_3$: $d_3 = 5{,}0\text{ km}$, $P_3 = R\$ 18{,}50$
- **Distância Isolada**: $D_{isolada} = 5{,}0 + 6{,}0 + 5{,}0 = 16{,}0\text{ km}$
- **Distância Conjunta da Rota**: $D_{conjunta} = 11{,}0\text{ km}$
- **Distância Economizada**: $\Delta D = 16{,}0 - 11{,}0 = 5{,}0\text{ km}$
- **Economia Bruta**: $E_{total} = 5{,}0 \times R\$ 2{,}50 = R\$ 12{,}50$
- **Bônus do Entregador**: $B_{courier} = R\$ 6{,}25$
- **Desconto Total dos Lojistas**: $D_{clientes} = R\$ 6{,}25$
- **Distribuição dos Descontos**:
  - $O_1$: $6{,}25 \times (5 / 16) = R\$ 1{,}95 \implies \text{Preço Final}_1 = R\$ 16{,}55$
  - $O_2$: $6{,}25 \times (6 / 16) = R\$ 2{,}34 \implies \text{Resíduo } +0{,}01 \implies \text{Desconto}_2 = R\$ 2{,}35 \implies \text{Preço Final}_2 = R\$ 18{,}65$
  - $O_3$: $6{,}25 \times (5 / 16) = R\$ 1{,}95 \implies \text{Preço Final}_3 = R\$ 16{,}55$
- **Total Descontos**: $1{,}95 + 2{,}35 + 1{,}95 = R\$ 6{,}25$ (100% de exatidão contábil).

---

## 3. Backlog de Tarefas Entregue

### Fase 1: Arquitetura de Software e Motor de Rateio no Backend (Laravel 13)
- [x] Implementar a classe de serviço dedicada `App\Services\DynamicApportionmentService`:
  - Método `calculateApportionment(Collection $orders, float $jointDistanceKm, float $tariffPerKm = 2.50): array`.
  - Método `applyApportionmentToGroup(DeliveryGroup $group, float $jointDistanceKm): array`.
  - Tratamento determinístico de conservação contábil de centavos.
- [x] Refatorar `BatchClusteringService` para delegar o cálculo de rateio integralmente ao `DynamicApportionmentService`.
- [x] Implementar controller dedicado `App\Http\Controllers\Api\FinancialController`:
  - `GET /api/client/financial-statement`:
    - Resumo consolidado: Total de fretes contratados, total original sem rateio, economia acumulada em R$, percentual médio de economia e total final efetivamente pago.
    - Lista detalhada de pedidos com discriminação de valores individuais, descontos de rateio e lotes aos quais pertenceram.
  - `GET /api/courier/financial-statement`:
    - Resumo consolidado: Total de corridas/lotes executados, faturamento bruto consolidado, ganhos por frete base, bônus de produtividade acumulados e indicador de rendimento ($R\$/km$).
    - Lista detalhada de lotes econômicos e entregas expressas com detalhamento de km rodado e bônus auferidos.
- [x] Registrar rotas protegidas em `routes/api.php` com isolamento por perfil (`EnsureUserIsClient`, `EnsureUserIsCourier`).

### Fase 2: Testes Automatizados no Backend com Pest v3
- [x] Criar suíte de testes unitários `tests/Unit/DynamicApportionmentServiceTest.php`:
  - Validação estrita do caso canônico do TCC (16 km vs 11 km).
  - Teste de conservação matemática (soma dos descontos igual a 50% da economia bruta sob diversos cenários de distâncias e frações).
  - Teste de cenário limite sem economia ($D_{conjunta} \ge D_{isolada}$) com fallback seguro (descontos e bônus zerados sem gerar valores negativos).
- [x] Criar suíte de testes de integração `tests/Feature/FinancialStatementTest.php`:
  - `GET /api/client/financial-statement`: estrutura do JSON, cálculo de economia e restrição para condutores.
  - `GET /api/courier/financial-statement`: estrutura do JSON, métricas de $R\$/km$ e restrição para clientes.
  - Validação de isolamento e bloqueio 403 entre papéis.

### Fase 3: Telas e Módulos Financeiros no Mobile (React Native / Expo SDK 54)
- [x] Criar serviço de API no frontend `mobile/src/services/financialService.ts` com tipagem TypeScript completa (`ClientFinancialStatement`, `CourierFinancialStatement`).
- [x] Implementar a tela de Extrato do Lojista: `mobile/app/(client)/financial.tsx`:
  - Card hero com destaque visual em verde Zarpa: "Economia Total com o Zarpa (R$)".
  - Grid de métricas rápidas: Total Pago, Frete sem Rateio, % Médio Economizado.
  - Tabela/lista de transações com badge de modalidade, comparativo riscado do frete original vs valor final com desconto e data.
- [x] Implementar a tela de Extrato do Entregador: `mobile/app/(courier)/financial.tsx`:
  - Card hero com destaque visual: "Ganhos Totais Acumulados (R$)".
  - Grid de métricas de eficiência: Ganhos Base, Bônus de Lotes Econômicos e Indicador de Rendimento ($R\$/km$).
  - Histórico de lotes e entregas com badges informativos de bonificação.
- [x] Atualizar os layouts de navegação `mobile/app/(client)/_layout.tsx` e `mobile/app/(courier)/_layout.tsx` adicionando a aba "Extrato" / "Ganhos" com ícones temáticos (`wallet`).

### Fase 4: Testes Automatizados no Mobile com Jest
- [x] Criar `mobile/__tests__/FinancialStatement.test.tsx`:
  - Renderização da tela financeira do lojista com valores monetários em Real (BRL), percentual de desconto e lista de pedidos.
  - Alternância de filtros por modalidade e desconto de rateio.
  - Renderização da tela financeira do entregador com métricas de rendimento ($R\$/km$), ganhos base e bônus de produtividade.
  - Alternância de abas entre Lotes Econômicos e Entregas Expressas.

### Fase 5: Testes End-to-End (E2E) com Maestro
- [x] Criar `/.maestro/financial_statement_flow.yaml`:
  - Login como Lojista (`lojista@zarpa.com.br`), navegação até a aba de Extrato Financeiro e validação dos cards de economia gerada.
  - Alternância para condutor parceiro (`entregador@zarpa.com.br`), navegação até o Extrato do Entregador e validação do faturamento e bônus de produtividade.

---

## 4. Critérios de Aceitação & Definition of Done (DoD)

- [x] O motor matemático `DynamicApportionmentService` executa de maneira determinística, assegurando que o bônus do condutor e o desconto coletivo dos lojistas totalizem exatamente 50% da economia bruta de frete.
- [x] Não há dispersão de centavos na partilha: a soma dos descontos proporcionais dos lojistas é rigorosamente igual à metade da economia gerada.
- [x] Lojistas conseguem consultar seu extrato financeiro via API e visualizar com transparência o desconto recebido em cada frete econômico.
- [x] Entregadores conseguem consultar seu extrato financeiro via API e visualizar o rendimento médio por km rodado ($R\$/km$) e o bônus de produtividade recebido pelos lotes.
- [x] As telas mobile apresentam visual limpo, moderno e responsivo, aderente à identidade visual do Zarpa.
- [x] Todos os testes unitários e de integração no backend (Pest v3) e frontend (Jest) são aprovados com 100% de sucesso.
- [x] O fluxo E2E `financial_statement_flow.yaml` é estruturado e validado.

---

## 5. Métricas Finais de Validação

- **Testes Backend (Pest v3)**: **53 testes aprovados (476 asserções)** em 4.56s.
- **Testes Frontend (Jest)**: **13 suítes aprovadas, 42 testes unitários/componente aprovados** em 4.28s.
- **Tipagem TypeScript**: **0 erros (`npx tsc --noEmit`)**.
- **Regressão**: Nenhuma regressão detectada em fluxos de autenticação, geocodificação, postagem, concorrência ou lotes econômicos.
