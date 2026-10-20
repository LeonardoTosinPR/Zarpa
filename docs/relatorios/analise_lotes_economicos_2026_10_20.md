# Relatório de Análise Operacional e Financeira dos Lotes Econômicos (Pós-Sprint 6)

**Data:** 20 de Outubro de 2026  
**Autor:** Leonardo Tosin / Plataforma Zarpa  
**Cidade:** Guarapuava - PR  
**Status:** Validado com dados reais no banco de homologação (Sprints 5 e 6 consolidadas)  

---

## 1. Contexto e Evolução da Plataforma (De 13/10 para 20/10/2026)

Na auditoria anterior (13/10/2026), constatou-se que o agrupamento de rotas economizava quilometragem substancial na malha viária de Guarapuava, mas que a margem retida pela plataforma (71,9%) abria espaço para **valorizar de forma mais justa o entregador parceiro** a cada ponto atendido.

Com a conclusão das **Sprints 5 e 6**, o ecossistema Zarpa incorporou melhorias estruturais e operacionais que transformaram a dinâmica financeira e de execução em campo:

1. **Taxa de Parada Concluída (`STOP_FEE_PER_DELIVERY = R$ 3,00`) + Rateio Cooperativo 50/50:**
   - Todo pedido atendido em um lote econômico adiciona **R$ 3,00** diretamente à remuneração do condutor, somando-se aos **50% da economia viária** gerada pelo compartilhamento da rota.
   - Na interface mobile do entregador (**Lotes Econômicos** e **Agenda da Rota**), ambos os incentivos foram consolidados em um único indicador **BÔNUS** (`Taxa de Paradas + Bônus Rateio 50%`), simplificando a leitura em trânsito.
2. **Ciclo de Vida Completo da Rota Sequenciada (Sprint 6):**
   - Execução passo a passo (`assigned` → `in_progress` → `completed`) respeitando estritamente a precedência de coleta antes da entrega ($\text{pickup}_i < \text{delivery}_i$).
3. **Comprovante de Entrega Obrigatório (Código de 6 Dígitos ou Foto):**
   - Geração automática de um código numérico de 6 dígitos (`delivery_code`) visível apenas para o lojista/destinatário assim que a entrega é aceita ou o lote é gerado. O entregador valida a entrega digitando o código informado no ato do recebimento ou anexando foto comprobatória.
4. **Navegação GPS Unificada Multi-Paradas:**
   - Transbordamento em um único toque para o Google Maps / Waze contendo **todas as paradas pendentes do lote como waypoints encadeados**, substituindo a abertura isolada ponto a ponto.
5. **Painel Administrativo Master com Disparo Manual do Lote Noturno:**
   - Permite auditar usuários, pedidos (com código de confirmação e status de comprovante) e acionar manualmente o motor de agrupamento noturno a qualquer momento.

---

## 2. Panorama Atual do Banco de Dados (20/10/2026)

A auditoria direta no banco PostgreSQL/PostGIS (`zarpa`) apurou o seguinte estado operacional:

- **Usuários Cadastrados:** **12 contas** (7 Lojistas/Comércios de Guarapuava e 5 Perfis Operacionais/Entregadores).
- **Volume Total de Pedidos:** **148 pedidos** registrados:
  - **108 pedidos na Modalidade Econômica** (100% agrupados em lotes e 100% com `delivery_code` de 6 dígitos gerado).
  - **40 pedidos na Modalidade Expressa** (disponíveis no Radar Expresso para disputa sob demanda).
- **Lotes Econômicos Processados (`delivery_groups`):** **40 lotes** estruturados, somando **216 paradas sequenciadas** (108 coletas e 108 entregas):
  - **38 lotes com status `assigned`** (prontos para início de jornada pelo entregador).
  - **2 lotes com status `completed`** (Lotes **#34** e **#40**, totalizando **4 pedidos entregues**, **8 paradas concluídas** e **4 comprovantes de entrega validados**).

---

## 3. Resultados Consolidados dos 40 Lotes Econômicos

| Indicador Operacional / Financeiro | Valor Apurado (20/10/2026) | Impacto no Ecossistema (Pós-Sprint 6) |
| :--- | :---: | :--- |
| **Total de Lotes Processados** | **40 lotes** | Distribuídos entre os pólos Centro, Santa Cruz, Bonsucesso e Cidade dos Lagos |
| **Total de Entregas Econômicas** | **108 entregas (216 paradas)** | Média de 2,7 entregas (5,4 paradas) por lote |
| **Distância Se Fossem Isoladas ($\sum D_{\text{isol}}$)** | **313,96 km** | Soma das distâncias diretas origem-destino sem considerar retorno |
| **Distância Real Percorrida nos Lotes ($D_{\text{lote}}$)** | **241,65 km** | Roteamento multi-paradas OSRM com precedência de coleta |
| **Quilometragem Líquida Poupada** | **-72,31 km** | **23,03% de redução líquida** (e **83,26 km** poupados nos lotes convergentes) |
| **Valor Original dos Fretes (Sem Rateio)** | **R$ 1.776,38** | Custo que os lojistas pagariam na tarifa individual |
| **Desconto Concedido aos Lojistas (Rateio 50%)** | **- R$ 104,15** | Economia direta repassada proporcionalmente aos comércios |
| **Receita Efetiva Paga pelos Lojistas** | **R$ 1.672,23** | Faturamento bruto arrecadado nos 40 lotes |
| **Frete Base de Rota dos Entregadores** | **R$ 604,24** | Remuneração quilométrica base ($241,65 \text{ km} \times \text{R\$ } 2,50\text{/km}$) |
| **Bônus Unificado dos Entregadores** | **+ R$ 428,15** | **R$ 324,00** (108 paradas $\times$ R$ 3,00) + **R$ 104,15** (50% economia viária) |
| **Repasse Total aos Entregadores** | **R$ 1.032,39** | **61,74% da receita dos lotes** (média de **R$ 4,27 por km rodado**) |
| **Margem Líquida Retida pelo App Zarpa** | **R$ 639,84** | **38,26% de margem operacional sustentável** |
| **Economia Viária Bruta Gerada nos Clusters** | **R$ 208,16** | Dividida 50/50 entre descontos aos lojistas e bônus aos condutores |

---

## 4. Comparativo de Evolução: Antes vs. Depois das Sprints 5 e 6

A tabela abaixo demonstra como a implementação da recomendação do relatório anterior (introdução da taxa de parada de R$ 3,00 + consolidação do bônus + execução guiada da Sprint 6) equilibrou a economia entre os três atores da plataforma:

| Métrica de Equilíbrio | Auditoria Anterior (13/10) | Auditoria Atual (20/10 - Sprint 6) | Evolução Observada |
| :--- | :---: | :---: | :--- |
| **Participação do Entregador na Receita** | 28,1% (R$ 771,36 / R$ 2.746,62) | **61,7% (R$ 1.032,39 / R$ 1.672,23)** | **+33,6 p.p.** de repasse direto ao condutor |
| **Ganho Médio do Motoboy por Km** | R$ 2,59 / km | **R$ 4,27 / km** | **+64,9% de valorização** por quilômetro rodado |
| **Bônus Adicional sobre o Frete de Rota** | +3,4% (apenas rateio) | **+70,9% (Bônus Unificado: Paradas + 50%)** | Forte incentivo para aceitação de lotes multi-paradas |
| **Margem da Plataforma Zarpa** | 71,9% | **38,3%** | Equilíbrio saudável e competitivo para o marketplace |
| **Segurança na Entrega (Anti-Fraude)** | Sem validação formal | **100% com Código de 6 dígitos / Foto** | Rastreabilidade ponta a ponta para o lojista |

---

## 5. Extrato Completo dos 40 Lotes Auditados no Banco

> **Nota sobre a coluna "Bônus Unificado":** Reflete exatamente a nova exibição do app mobile para o entregador, somando a **Taxa de Paradas (R$ 3,00 por entrega)** com o **Bônus de 50% do Rateio Cooperativo**.

| Lote ID | Status | Condutor Atribuído | Pedidos (Paradas) | Dist. Lote | Dist. Isolada | Dif. Km | Pago p/ Lojistas | Frete Rota | Bônus Unificado | Ganho Total Motoboy | Margem App | Econ. Viária (R$) |
| :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **#1** | `assigned` | André Martins (Cidade dos Lagos) | 5 (10) | 15,62 km | 24,10 km | -8,48 km | R$ 85,21 | R$ 39,05 | + R$ 25,60 | **R$ 64,65** | R$ 20,56 | R$ 21,20 |
| **#2** | `assigned` | Lucas Pereira (Santa Cruz) | 5 (10) | 10,78 km | 15,37 km | -4,59 km | R$ 71,85 | R$ 26,95 | + R$ 20,74 | **R$ 47,69** | R$ 24,16 | R$ 11,48 |
| **#3** | `assigned` | Carlos Motoboy (Centro) | 5 (10) | 11,22 km | 15,79 km | -4,57 km | R$ 73,67 | R$ 28,05 | + R$ 20,72 | **R$ 48,77** | R$ 24,90 | R$ 11,43 |
| **#4** | `assigned` | Administrador Zarpa | 4 (8) | 17,40 km | 12,94 km | +4,46 km | R$ 64,16 | R$ 43,50 | + R$ 12,00 | **R$ 55,50** | R$ 8,66 | R$ 0,00 |
| **#5** | `assigned` | Marcos Silva (Bonsucesso) | 3 (6) | 6,82 km | 4,73 km | +2,09 km | R$ 41,53 | R$ 17,05 | + R$ 9,00 | **R$ 26,05** | R$ 15,48 | R$ 0,00 |
| **#6** | `assigned` | Lucas Pereira (Santa Cruz) | 3 (6) | 1,47 km | 2,13 km | -0,66 km | R$ 31,70 | R$ 3,68 | + R$ 9,83 | **R$ 13,51** | R$ 18,19 | R$ 1,65 |
| **#7** | `assigned` | Lucas Pereira (Santa Cruz) | 4 (8) | 8,31 km | 10,47 km | -2,16 km | R$ 49,58 | R$ 20,78 | + R$ 14,70 | **R$ 35,48** | R$ 14,10 | R$ 5,40 |
| **#8** | `assigned` | Lucas Pereira (Santa Cruz) | 4 (8) | 11,53 km | 16,25 km | -4,72 km | R$ 66,38 | R$ 28,83 | + R$ 17,90 | **R$ 46,73** | R$ 19,65 | R$ 11,80 |
| **#9** | `assigned` | Lucas Pereira (Santa Cruz) | 2 (4) | 7,32 km | 7,99 km | -0,67 km | R$ 39,39 | R$ 18,30 | + R$ 6,84 | **R$ 25,14** | R$ 14,25 | R$ 1,68 |
| **#10** | `assigned` | Carlos Motoboy (Centro) | 2 (4) | 5,93 km | 9,24 km | -3,31 km | R$ 41,77 | R$ 14,83 | + R$ 10,14 | **R$ 24,97** | R$ 16,80 | R$ 8,28 |
| **#11** | `assigned` | Lucas Pereira (Santa Cruz) | 2 (4) | 4,66 km | 6,16 km | -1,50 km | R$ 30,92 | R$ 11,65 | + R$ 7,88 | **R$ 19,53** | R$ 11,39 | R$ 3,75 |
| **#12** | `assigned` | Lucas Pereira (Santa Cruz) | 2 (4) | 4,02 km | 3,17 km | +0,85 km | R$ 30,73 | R$ 10,05 | + R$ 6,00 | **R$ 16,05** | R$ 14,68 | R$ 0,00 |
| **#13** | `assigned` | Marcos Silva (Bonsucesso) | 2 (4) | 5,00 km | 8,22 km | -3,22 km | R$ 40,52 | R$ 12,50 | + R$ 10,03 | **R$ 22,53** | R$ 17,99 | R$ 8,05 |
| **#14** | `assigned` | Lucas Pereira (Santa Cruz) | 3 (6) | 6,30 km | 10,52 km | -4,22 km | R$ 48,63 | R$ 15,75 | + R$ 14,28 | **R$ 30,03** | R$ 18,60 | R$ 10,55 |
| **#15** | `assigned` | Lucas Pereira (Santa Cruz) | 3 (6) | 3,85 km | 5,50 km | -1,65 km | R$ 37,48 | R$ 9,63 | + R$ 11,07 | **R$ 20,70** | R$ 16,78 | R$ 4,13 |
| **#16** | `assigned` | Lucas Pereira (Santa Cruz) | 2 (4) | 4,11 km | 4,04 km | +0,07 km | R$ 35,31 | R$ 10,28 | + R$ 6,00 | **R$ 16,28** | R$ 19,03 | R$ 0,00 |
| **#17** | `assigned` | Lucas Pereira (Santa Cruz) | 1 (2) | 0,97 km | 0,97 km | 0,00 km | R$ 18,03 | R$ 2,43 | + R$ 3,00 | **R$ 5,43** | R$ 12,60 | R$ 0,00 |
| **#18** | `assigned` | Lucas Pereira (Santa Cruz) | 2 (4) | 3,15 km | 3,99 km | -0,84 km | R$ 27,68 | R$ 7,88 | + R$ 7,05 | **R$ 14,93** | R$ 12,75 | R$ 2,10 |
| **#19** | `assigned` | Lucas Pereira (Santa Cruz) | 1 (2) | 0,78 km | 0,78 km | 0,00 km | R$ 15,75 | R$ 1,95 | + R$ 3,00 | **R$ 4,95** | R$ 10,80 | R$ 0,00 |
| **#20** | `assigned` | Lucas Pereira (Santa Cruz) | 1 (2) | 2,23 km | 2,23 km | 0,00 km | R$ 22,08 | R$ 5,58 | + R$ 3,00 | **R$ 8,58** | R$ 13,50 | R$ 0,00 |
| **#21** | `assigned` | Lucas Pereira (Santa Cruz) | 1 (2) | 3,79 km | 3,79 km | 0,00 km | R$ 24,03 | R$ 9,48 | + R$ 3,00 | **R$ 12,48** | R$ 11,55 | R$ 0,00 |
| **#22** | `assigned` | Carlos Motoboy (Centro) | 1 (2) | 4,53 km | 4,53 km | 0,00 km | R$ 23,18 | R$ 11,33 | + R$ 3,00 | **R$ 14,33** | R$ 8,85 | R$ 0,00 |
| **#23** | `assigned` | Carlos Motoboy (Centro) | 3 (6) | 4,27 km | 6,37 km | -2,10 km | R$ 42,86 | R$ 10,68 | + R$ 11,63 | **R$ 22,31** | R$ 20,55 | R$ 5,25 |
| **#24** | `assigned` | Administrador Zarpa | 5 (10) | 7,03 km | 14,29 km | -7,26 km | R$ 61,15 | R$ 17,58 | + R$ 24,08 | **R$ 41,66** | R$ 19,49 | R$ 18,15 |
| **#25** | `assigned` | Carlos Motoboy (Centro) | 3 (6) | 5,51 km | 8,09 km | -2,58 km | R$ 47,61 | R$ 13,78 | + R$ 12,23 | **R$ 26,01** | R$ 21,60 | R$ 6,45 |
| **#26** | `assigned` | Carlos Motoboy (Centro) | 3 (6) | 5,53 km | 6,84 km | -1,31 km | R$ 41,12 | R$ 13,83 | + R$ 10,64 | **R$ 24,47** | R$ 16,65 | R$ 3,28 |
| **#27** | `assigned` | Carlos Motoboy (Centro) | 5 (10) | 8,43 km | 19,19 km | -10,76 km | R$ 68,74 | R$ 21,08 | + R$ 28,45 | **R$ 49,53** | R$ 19,21 | R$ 26,90 |
| **#28** | `assigned` | Carlos Motoboy (Centro) | 2 (4) | 2,95 km | 3,18 km | -0,23 km | R$ 34,21 | R$ 7,38 | + R$ 6,29 | **R$ 13,67** | R$ 20,54 | R$ 0,58 |
| **#29** | `assigned` | Carlos Motoboy (Centro) | 3 (6) | 4,72 km | 6,68 km | -1,96 km | R$ 41,11 | R$ 11,80 | + R$ 11,45 | **R$ 23,25** | R$ 17,86 | R$ 4,90 |
| **#30** | `assigned` | Carlos Motoboy (Centro) | 5 (10) | 12,86 km | 11,11 km | +1,75 km | R$ 59,41 | R$ 32,15 | + R$ 15,00 | **R$ 47,15** | R$ 12,26 | R$ 0,00 |
| **#31** | `assigned` | Carlos Motoboy (Centro) | 5 (10) | 9,63 km | 18,88 km | -9,25 km | R$ 69,09 | R$ 24,08 | + R$ 26,57 | **R$ 50,65** | R$ 18,44 | R$ 23,13 |
| **#32** | `assigned` | Carlos Motoboy (Centro) | 3 (6) | 8,19 km | 12,00 km | -3,81 km | R$ 45,79 | R$ 20,48 | + R$ 13,77 | **R$ 34,25** | R$ 11,54 | R$ 9,53 |
| **#33** | `assigned` | Carlos Motoboy (Centro) | 1 (2) | 6,04 km | 6,04 km | 0,00 km | R$ 31,60 | R$ 15,10 | + R$ 3,00 | **R$ 18,10** | R$ 13,50 | R$ 0,00 |
| **#34** | `completed` | Carlos Motoboy (Centro) | 3 (6 concl.) | 7,31 km | 8,68 km | -1,37 km | R$ 49,83 | R$ 18,28 | + R$ 10,72 | **R$ 29,00** | R$ 20,83 | R$ 3,43 |
| **#35** | `assigned` | Carlos Motoboy (Centro) | 2 (4) | 2,37 km | 3,98 km | -1,61 km | R$ 31,78 | R$ 5,93 | + R$ 8,02 | **R$ 13,95** | R$ 17,83 | R$ 4,03 |
| **#36** | `assigned` | Carlos Motoboy (Centro) | 2 (4) | 5,83 km | 4,12 km | +1,71 km | R$ 37,31 | R$ 14,58 | + R$ 6,00 | **R$ 20,58** | R$ 16,73 | R$ 0,00 |
| **#37** | `assigned` | Carlos Motoboy (Centro) | 1 (2) | 2,66 km | 2,66 km | 0,00 km | R$ 22,10 | R$ 6,65 | + R$ 3,00 | **R$ 9,65** | R$ 12,45 | R$ 0,00 |
| **#38** | `assigned` | Carlos Motoboy (Centro) | 2 (4) | 5,82 km | 6,23 km | -0,41 km | R$ 36,81 | R$ 14,55 | + R$ 6,52 | **R$ 21,07** | R$ 15,74 | R$ 1,03 |
| **#39** | `assigned` | Carlos Motoboy (Centro) | 1 (2) | 1,04 km | 1,04 km | 0,00 km | R$ 18,95 | R$ 2,60 | + R$ 3,00 | **R$ 5,60** | R$ 13,35 | R$ 0,00 |
| **#40** | `completed` | Carlos Motoboy (Centro) | 1 (2 concl.) | 1,67 km | 1,67 km | 0,00 km | R$ 13,18 | R$ 4,18 | + R$ 3,00 | **R$ 7,18** | R$ 6,00 | R$ 0,00 |
| **TOTAIS** | **40 lotes** | **5 Condutores** | **108 (216)** | **241,65 km** | **313,96 km** | **-72,31 km** | **R$ 1.672,23** | **R$ 604,24** | **+ R$ 428,15** | **R$ 1.032,39** | **R$ 639,84** | **R$ 208,16** |

---

## 6. Análise de Destaques da Sprint 6 em Campo

1. **Estudo de Caso — Lote #27 (Alta Convergência no Polo Centro):**
   - **5 pedidos agrupados (10 paradas):** Se entregues isoladamente, exigiriam **19,19 km** (sem contar o retorno entre coletas). Na rota sequenciada pelo OSRM, o entregador percorreu apenas **8,43 km** (redução de **56,1%** na distância).
   - **Economia Gerada:** **R$ 26,90** em quilometragem poupada.
   - **Lojistas:** Receberam **R$ 13,45** de desconto direto distribuído proporcionalmente.
   - **Entregador:** Recebeu **R$ 21,08** pelo frete da rota + **R$ 28,45 de Bônus Unificado** (R$ 15,00 pelas 5 entregas + R$ 13,45 do rateio 50%), totalizando **R$ 49,53** em uma rota de apenas 19 minutos (**R$ 5,87/km**).

2. **Proteção do Entregador em Lotes Sem Economia de Distância (Ex: Lotes #4 e #30):**
   - Quando a malha viária exige contornos para respeitar a precedência de coleta antes da entrega ($D_{\text{lote}} > \sum D_{\text{isol}}$), o algoritmo trava o desconto/bônus de rateio em `R$ 0,00` (nunca penalizando nem o lojista nem o motoboy), mas **garante integralmente o Bônus de Parada (`R$ 3,00/entrega`)** e remunera 100% da quilometragem real rodada na rota OSRM.

3. **Execução Concluída com Comprovante (Lotes #34 e #40):**
   - Os lotes **#34** (6 paradas concluídas) e **#40** (2 paradas concluídas) validam o fluxo completo da Sprint 6: início da jornada (`in_progress`), confirmação sequencial de coletas (`picked_up`), validação de entregas (`delivered`) mediante código de 6 dígitos ou foto comprobatória (`proof_photo_url`) e encerramento formal do lote (`completed`).

---

## 7. Conclusão Técnica

Com as entregas da **Sprint 6**, o Zarpa atingiu a maturidade operacional prevista no plano do TCC:
- **Para o Lojista:** Economia auditável no frete, rastreamento em tempo real com telemetria GPS e segurança de entrega via código de confirmação de 6 dígitos.
- **Para o Entregador:** Remuneração média de **R$ 4,27/km** nos lotes econômicos, **Bônus Unificado** claro na interface e navegação veicular externa em rota única com múltiplos waypoints no Google Maps / Waze.
- **Para o Administrador:** Controle centralizado no Painel Master com disparo manual do lote noturno e auditoria em tempo real de usuários, fretes e comprovantes.

