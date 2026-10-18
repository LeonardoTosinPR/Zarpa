# Relatório de Análise Operacional e Financeira dos Lotes Econômicos

**Data:** 13 de Outubro de 2026  
**Autor:** Leonardo Tosin / Plataforma Zarpa  
**Cidade:** Guarapuava - PR  
**Status:** Validado com dados reais em banco de produção/homologação  

---

## 1. Contexto e Motivação da Análise

Durante a operação de entregas urbanas sob demanda, uma dúvida frequente surge quanto ao impacto do agrupamento de pedidos na remuneração e esforço físico do entregador:

> *"Se cada entrega isolada possui uma distância individual menor do que a rota de um lote inteiro com múltiplas paradas, o entregador tem prejuízo rodando mais quilômetros? E afinal, quantos reais foram realmente economizados pelo aplicativo no fim do dia?"*

Para responder a essa pergunta de forma quantitativa e fundamentada, foi realizada uma auditoria analítica nos dados dos **23 lotes econômicos** gerados e processados na base de dados do Zarpa na data de hoje (**13/10/2026**).

---

## 2. Metodologia: Como a Análise Foi Realizada

A metodologia consistiu em comparar dois cenários logísticos para o mesmo conjunto de **73 pedidos econômicos**:

### Cenário A: Modelo Convencional (Entregas Isoladas / Bate-e-Volta)
Cada pedido é realizado por um entregador exclusivo ou em viagens separadas:
- O motoboy parte da base/loja, se desloca até o cliente e realiza a entrega.
- Para cada novo pedido, é necessária uma nova viagem completa.
- **Distância Teórica Mínima:** $\sum D_{\text{isoladas}} = \sum_{i=1}^{n} \text{distância}(\text{origem}_i, \text{destino}_i)$ (sem considerar o trajeto de retorno).

### Cenário B: Modelo Zarpa (Lote Econômico Multi-Paradas com Clustering Geográfico)
Pedidos convergentes no mesmo quadrante geográfico e horário são agrupados respeitando restrições de peso (máx. 15 kg), volume (máx. 0,12 m³) e direção de viagem (Similaridade de Cosseno):
- A rota calcula a sequência ótima de paradas garantindo que **cada coleta preceda sua respectiva entrega** ($\text{pickup}_i < \text{dropoff}_i$).
- **Distância Real do Lote:** $D_{\text{lote}}$, calculada via roteamento real OSRM (Open Source Routing Machine).

### Variáveis Auditadas em Banco de Dados:
- `total_distance_km` da tabela `delivery_groups`.
- `distance_km`, `individual_freight_price` e `final_freight_price` da tabela `orders`.
- `courier_bonus` e `total_savings_generated` calculados pelo `DynamicApportionmentService`.
- Tarifa operacional de custo por quilômetro: **R$ 2,50/km**.

---

## 3. Resultados Consolidados do Dia (13/10/2026)

| Indicador Operacional / Financeiro | Valor Apurado | Impacto no Ecossistema |
| :--- | :---: | :--- |
| **Total de Lotes Processados** | **23 lotes** | Agrupamentos em diferentes pólos urbanos de Guarapuava |
| **Total de Pedidos Econômicos** | **73 entregas** | Média de ~3,2 a 10 entregas por lote |
| **Distância Se Fossem Isoladas ($\sum D_{\text{isol}}$)** | **512,00 km** | Deslocamento nominal individual somado |
| **Distância Real Percorrida nos Lotes ($D_{\text{lote}}$)** | **298,34 km** | Roteamento multi-paradas executado |
| **Quilometragem Poupada no Trânsito** | **-213,66 km** | **41,7% de redução no tráfego urbano** |
| **Receita Paga pelos Lojistas** | **R$ 2.746,62** | Fretes cobrados (com descontos do rateio inclusos) |
| **Repasse Total aos Entregadores** | **R$ 771,36** | R$ 745,85 base de rota + R$ 25,51 bônus cooperativo |
| **Margem Bruta Retida pelo App Zarpa** | **R$ 1.975,26** | Saldo positivo de intermediação da plataforma |
| **Economia Viária Bruta em Combustível/Desgaste** | **R$ 534,23** | $213,66 \text{ km poupados} \times \text{R\$ } 2,50\text{/km}$ |

---

## 4. O Entregador Teve Prejuízo? (Análise de Produtividade)

### A Ilusão Óptica da Distância
À primeira vista, pode parecer que o entregador rodou mais porque a rota de um lote tem $7 \text{ km}$ enquanto um pedido individual tem apenas $1,2 \text{ km}$. No entanto:

1. **No modelo isolado:** Para entregar 8 pedidos, o motoboy precisaria fazer **8 viagens distintas**. Se cada viagem média tem $2,6 \text{ km}$, ele rodaria $20,8 \text{ km}$ somando apenas as idas (ou mais de $40 \text{ km}$ somando os retornos entre bairros).
2. **No modelo de lote:** Para entregar esses mesmos 8 pedidos, o Zarpa organizou as paradas em sequência na mesma vizinhança. O motoboy percorreu apenas **$7,75 \text{ km}$** para concluir todas as 8 entregas (como visto no Lote #4).

### Conclusão sobre o Entregador:
- **Não houve prejuízo de quilometragem:** Pelo contrário, o motoboy economizou **mais de 213 km de esforço e combustível** ao longo do dia para atender o mesmo volume de clientes.
- **Densidade de Ganho:** Em vez de receber por 1 entrega e passar tempo parado esperando a próxima corrida, ele realizou até 10 entregas contínuas em um único raio de deslocamento, maximizando o ganho por hora trabalhada.

---

## 5. Extrato Completo dos 23 Lotes Analisados

| Lote ID | Pedidos | Dist. Lote | Dist. Isolada | Diferença Km | Pago p/ Lojistas | Ganho Motoboy | Margem App | Economia Real (R$) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **#1** | 10 | 29,62 km | 42,28 km | -12,66 km | R$ 173,22 | R$ 74,05 | R$ 99,17 | R$ 31,65 |
| **#2** | 8 | 20,77 km | 33,46 km | -12,69 km | R$ 151,48 | R$ 51,93 | R$ 99,55 | R$ 31,73 |
| **#3** | 8 | 20,09 km | 31,24 km | -11,15 km | R$ 142,92 | R$ 50,23 | R$ 92,69 | R$ 27,88 |
| **#4** | 8 | 7,75 km | 21,04 km | -13,29 km | R$ 109,88 | R$ 22,85 | R$ 87,03 | R$ 33,23 |
| **#5** | 8 | 10,46 km | 14,66 km | -4,20 km | R$ 102,38 | R$ 26,15 | R$ 76,23 | R$ 10,50 |
| **#6** | 8 | 21,71 km | 41,00 km | -19,29 km | R$ 170,92 | R$ 54,28 | R$ 116,64 | R$ 48,23 |
| **#7** | 6 | 14,95 km | 24,84 km | -9,89 km | R$ 119,10 | R$ 37,38 | R$ 81,72 | R$ 24,73 |
| **#8** | 8 | 15,31 km | 21,42 km | -6,11 km | R$ 113,86 | R$ 38,28 | R$ 75,58 | R$ 15,28 |
| **#9** | 6 | 26,49 km | 31,68 km | -5,19 km | R$ 131,10 | R$ 66,23 | R$ 64,87 | R$ 12,98 |
| **#10** | 4 | 4,15 km | 14,22 km | -10,07 km | R$ 69,56 | R$ 14,08 | R$ 55,48 | R$ 25,18 |
| **#11** | 4 | 7,81 km | 23,98 km | -16,17 km | R$ 100,20 | R$ 24,76 | R$ 75,44 | R$ 40,43 |
| **#12** | 4 | 3,71 km | 10,62 km | -6,91 km | R$ 72,36 | R$ 11,28 | R$ 61,08 | R$ 17,28 |
| **#13** | 6 | 25,24 km | 29,76 km | -4,52 km | R$ 124,22 | R$ 63,10 | R$ 61,12 | R$ 11,30 |
| **#14** | 4 | 7,82 km | 17,48 km | -9,66 km | R$ 88,80 | R$ 20,70 | R$ 68,10 | R$ 24,15 |
| **#15** | 6 | 18,78 km | 26,34 km | -7,56 km | R$ 114,18 | R$ 46,95 | R$ 67,23 | R$ 18,90 |
| **#16** | 6 | 24,64 km | 43,38 km | -18,74 km | R$ 155,26 | R$ 61,60 | R$ 93,66 | R$ 46,85 |
| **#17** | 4 | 9,50 km | 30,62 km | -21,12 km | R$ 114,22 | R$ 31,02 | R$ 83,20 | R$ 52,80 |
| **#18** | 4 | 7,79 km | 10,46 km | -2,67 km | R$ 70,86 | R$ 19,48 | R$ 51,38 | R$ 6,68 |
| **#19** | 2 | 3,07 km | 6,14 km | -3,07 km | R$ 43,26 | R$ 7,68 | R$ 35,58 | R$ 7,68 |
| **#20** | 2 | 1,69 km | 3,38 km | -1,69 km | R$ 36,06 | R$ 4,23 | R$ 31,83 | R$ 4,23 |
| **#21** | 10 | 3,39 km | 9,20 km | -5,81 km | R$ 175,36 | R$ 10,00 | R$ 165,36 | R$ 14,53 |
| **#22** | 10 | 4,23 km | 10,20 km | -5,97 km | R$ 178,22 | R$ 11,67 | R$ 166,55 | R$ 14,93 |
| **#23** | 10 | 9,37 km | 14,60 km | -5,23 km | R$ 189,20 | R$ 23,43 | R$ 165,77 | R$ 13,08 |
| **TOTAIS** | **73** | **298,34 km** | **512,00 km** | **-213,66 km** | **R$ 2.746,62** | **R$ 771,36** | **R$ 1.975,26** | **R$ 534,23** |

---

## 6. Quantos Reais Foram Realmente Economizados no Fim do Dia?

O valor economizado no fim do dia possui três respostas complementares, conforme a perspectiva:

### 1. Pelo Lojista (Desconto de Frete Percebido)
- **R$ 50,86 economizados diretamente**:
  - Sem o agrupamento, os lojistas teriam desembolsado **R$ 2.797,48** na tarifa expressa individual.
  - Com o modelo econômico cooperativo do Zarpa, pagaram **R$ 2.746,62**.

### 2. Pela Logística Urbana de Guarapuava (Economia de Combustível e Desgaste)
- **R$ 534,23 poupados no asfalto**:
  - A convergência de rotas evitou que **213,66 quilômetros** fossem rodados desnecessariamente na cidade.
  - Na base de cálculo de **R$ 2,50/km**, evitou-se um desperdício direto de mais de meio milhar de reais em combustível, manutenção de frota e emissões.

### 3. Pelo Caixa do Aplicativo (Sobra Líquida Operacional)
- **R$ 1.975,26 retidos pelo aplicativo**:
  - O app arrecadou **R$ 2.746,62** dos lojistas e repassou **R$ 771,36** aos entregadores.
  - Essa margem saudável de **71,9%** comprova a sustentabilidade financeira do modelo de consolidação de fretes em cidades de porte médio como Guarapuava.

---

## 7. Recomendações e Próximos Passos

1. **Ajuste na Distribuição de Valor ao Motoboy:**
   - Como o app obteve uma margem expressiva (R$ 1.975,26), é possível instituir uma taxa de incentivo por parada concluída (ex: R$ 1,00 a R$ 2,00 por ponto de entrega entregue com sucesso), aumentando a retenção e fidelização dos motoboys parceiros.
2. **Exibição Transparente no App:**
   - A tela de extrato financeiro já reflete esses bônus e economias tanto na visão do lojista quanto do entregador, fortalecendo a confiança no rateio cooperativo 50/50.
