---
name: zarpa-design-system
description: >-
  Design System oficial do aplicativo mobile Zarpa (React Native / Expo SDK 54).
  Contém tokens de design (cores, tipografia, espaçamentos, raios e sombras), catálogo
  de componentes reutilizáveis, diretrizes de safe area (react-native-safe-area-context)
  e padrões visuais para lojistas e entregadores.
---

# 🎨 Zarpa Mobile Design System

O **Zarpa Design System** estabelece a linguagem visual, os tokens de estilo e o catálogo de componentes reutilizáveis para o ecossistema móvel do Zarpa, desenvolvido em **React Native com Expo SDK 54** e **TypeScript**.

Este guia orienta o desenvolvimento de interfaces coesas, acessíveis e ergonômicas para os dois perfis da plataforma:
- 🏪 **Lojistas / Comerciantes**: Foco em simplicidade, clareza operacional na criação de pedidos, cotações transparentes e extratos financeiros auditáveis.
- 🛵 **Entregadores Parceiros**: Foco em alta legibilidade em trânsito, botões de toque generosos (mínimo 48dp), contraste adequado à luz do dia e transbordamento rápido para GPS.

---

## 1. 🌈 Tokens de Design (`src/constants/theme.ts`)

Todos os valores visuais são centralizados em `mobile/src/constants/theme.ts`. É expressamente proibido o uso de cores hexadecimais soltas ou espaçamentos mágicos no código de telas.

### Paleta de Cores Semânticas (`COLORS`)

| Token | Valor Hex | Finalidade / Semântica |
| :--- | :--- | :--- |
| `primary` | `#4338CA` | Cor primária institucional (Índigo Intenso). Ações principais, destaques ativos. |
| `primaryDark` | `#3730A3` | Estados de foco, hover e pressionamento da marca. |
| `primaryLight` | `#EEF2FF` | Fundos sutis de cards selecionados, chips ativos e badges. |
| `primaryBorder` | `#C7D2FE` | Contornos de elementos com ênfase primária. |
| `accent` | `#059669` | Verde Esmeralda. Representa ganhos financeiros, rotas econômicas, sucesso e status online. |
| `accentLight` | `#ECFDF5` | Fundos de cards de bonificação e economia viária. |
| `accentDark` | `#047857` | Textos escurecidos sobre fundos verdes para conformidade WCAG AA. |
| `background` | `#F8FAFC` | Fundo base das telas (cinza ultra-suave que reduz o cansaço visual). |
| `surface` | `#FFFFFF` | Fundo de cartões, modais, headers e superfícies elevadas. |
| `text` / `textPrimary` | `#111827` | Texto principal, títulos e números de alta relevância. |
| `textSecondary` | `#4B5563` | Subtítulos, labels descritivos e textos de apoio. |
| `textMuted` | `#9CA3AF` | Placeholders, textos desabilitados e metadados secundários. |
| `border` | `#E5E7EB` | Linhas divisórias e contornos de inputs neutros. |
| `borderFocus` | `#4338CA` | Borda ativa ao focar em campos de digitação. |
| `danger` / `error` | `#DC2626` | Alertas de erro, recusas e cancelamentos. |
| `dangerLight` | `#FEF2F2` | Fundo de caixas de erro e mensagens de validação. |
| `warning` | `#D97706` | Avisos de pendência e atenção moderada. |
| `warningLight` | `#FFFBEB` | Fundo de alertas informativos. |
| `white` | `#FFFFFF` | Branco puro para textos sobre fundos sólidos e ícones. |

---

### Tipografia (`FONTS`)

O Zarpa utiliza a tipografia nativa do sistema operacional (San Francisco no iOS, Roboto no Android) para máxima fidelidade e desempenho:

| Token | Peso da Fonte | Aplicação Recomendada |
| :--- | :--- | :--- |
| `regular` | `400` (Regular) | Corpo de texto, descrições longas e valores secundários. |
| `medium` | `600` (Semi-Bold) | Labels de formulário, botões secundários e cabeçalhos de tabela. |
| `bold` | `700` ou `800` (Bold) | Títulos de tela (H1/H2), valores em moeda ($R\$) e métricas hero. |

---

### Espaçamento Modular (`SPACING`)

Baseado em um grid de 4px / 8px:

```typescript
export const SPACING = {
  xs: 4,      // Micro-espaçamentos entre ícone e texto
  sm: 8,      // Espaçamentos internos de chips e gaps menores
  md: 12,     // Padding interno padrão de inputs e cartões compactos
  lg: 16,     // Margem externa de telas (gutter) e espaçamento entre seções
  xl: 20,     // Margem generosa de headers e divisórias
  xxl: 24,    // Margem ampla entre blocos funcionais
  xxxl: 32,   // Margem de separação de grupos principais
};
```

---

### Raios de Borda (`RADIUS`)

```typescript
export const RADIUS = {
  sm: 8,      // Botões pequenos, tags, badges e tooltips
  md: 12,     // Inputs, caixas de busca e botões padrão
  lg: 16,     // Cartões de pedidos, cards do radar e modais inferiores
  xl: 24,     // Cartões de destaque, folhas de ação (bottom sheets)
  full: 9999, // Avatares circulares e botões de pílula (pills)
};
```

---

### Elevação e Sombras (`SHADOWS`)

Tratamento multiplataforma (`elevation` no Android e `shadowOffset` no iOS):

- `SHADOWS.sm`: Cartões neutros em listas (`elevation: 1`).
- `SHADOWS.md`: Barras de navegação, headers flutuantes e cards ativos (`elevation: 2`).
- `SHADOWS.lg`: Modais, alertas e botões de chamada primária de destaque (`elevation: 4`).

---

## 2. 🧩 Catálogo de Componentes Reutilizáveis (`src/components/`)

Todos os componentes do design system são rigorosamente tipados em TypeScript, desacoplados de regras de negócio de backend e mantidos na pasta `mobile/src/components/`.

### 1. `Button` (`Button.tsx`)
Botão primário para ações de interface com suporte a múltiplas variantes visuais e feedback de toque.
- **Variantes**:
  - `primary`: Fundo `COLORS.primary`, texto branco em negrito.
  - `secondary`: Fundo cinza escuro ou esmeralda para alternâncias.
  - `outline`: Fundo transparente, borda de 1.5px e texto estilizado.
  - `danger`: Ações destrutivas com confirmação.
- **Props**:
  - `title: string`
  - `variant?: 'primary' | 'secondary' | 'outline' | 'danger'`
  - `loading?: boolean` (renderiza `ActivityIndicator` mantendo a área física)
  - `disabled?: boolean` (aplica opacidade `0.5` e bloqueia disparos múltiplos)
  - `onPress: () => void`

### 2. `Input` (`Input.tsx`)
Campo de digitação customizado com label acessível, ícone opcional à esquerda/direita, indicador de foco reativo e mensagem de erro em vermelho.
- **Props**:
  - `label?: string`
  - `error?: string`
  - `leftIcon?: React.ReactNode`
  - `secureTextEntry?: boolean`
  - Herda todas as propriedades padrão de `TextInputProps`.

### 3. `Header` (`Header.tsx`)
Barra superior de navegação global com integração nativa ao `react-native-safe-area-context`.
- Exibe o logotipo institucional do Zarpa.
- Avatar do usuário com a inicial do nome e indicador de perfil colorido (👑 Ouro / 🏪 Azul / 🛵 Esmeralda).
- Acesso rápido ao Perfil de usuário.

### 4. `RoleSelector` (`RoleSelector.tsx`)
Seletor interativo em formato de pílulas/cards para alternância entre papéis (`client` ou `courier`).
- Realce tátil com borda reforçada e fundo suave na opção ativa.

### 5. `MyMap` (`MyMap.tsx`)
Componente de mapa livre baseado em OpenStreetMap (OSM) e Leaflet via `expo-leaflet`, concebido para substituir Google Maps por uma solução sem custos de faturamento e compatível com Expo Go.
- Suporte a marcadores geográficos com ícones SVG customizados.
- Camada padrão OSM com cache transparente de azulejos.

### 6. `RouteMapPreview` (`RouteMapPreview.tsx`)
Componente avançado de visualização de rotas com:
- Marcador de coleta (Origem) e marcador de entrega (Destino).
- Renderização de polyline vetorial da geometria OSRM decodificada.
- Modo `current_location` para radar de chamados expressos com círculo translúcido de raio de cobertura em km.

---

## 3. 🛡️ Boas Práticas de Safe Area & Adaptação Android (`useAppInsets`)

Como o Android é o foco principal de desenvolvimento do projeto Zarpa, a aplicação adota o hook centralizado `useAppInsets()` (`src/hooks/useAppInsets.ts`):

1. **Garantia de Não-Sobreposição da Barra de Status no Android**:
   No Android, a altura da Status Bar pode ser omitida pelo `insets.top` caso a janela do sistema não esteja em modo edge-to-edge translúcido. Para eliminar qualquer sobreposição com ícones de bateria, Wi-Fi e relógio:
   ```typescript
   import { useAppInsets } from '../hooks/useAppInsets';

   const insets = useAppInsets();
   // insets.top já computa: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0)
   // insets.bottom já computa: Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 0)
   ```
2. **Provedor Global**: Toda a árvore da aplicação é envolvida por `<SafeAreaProvider>` no arquivo raiz [`mobile/app/_layout.tsx`](mobile/app/_layout.tsx).
3. **Componente `<Header />`**: Empregado como primeiro elemento nas telas de navegação, com padding superior dinâmico preenchendo o fundo atrás da barra de status com `COLORS.surface` e posicionando os controles perfeitamente abaixo dela.
4. **Telas com Mapas e Headers Flutuantes**: Em telas como [`express-radar.tsx`](mobile/app/(courier)/express-radar.tsx) e [`active-delivery.tsx`](mobile/app/(courier)/active-delivery.tsx), `insets.top` e `insets.bottom` garantem que botões de retorno, radar e cards flutuantes nunca colidam com os botões virtuais ou a barra de status do Android.

---

## 4. 🚪 Padrão Ergonômico de Logout ("Encerrar Sessão")

- **Regra de UX**: O botão "Encerrar Sessão" / "Sair da Conta" deve residir **exclusivamente** na tela de **Perfil do Usuário** (`/(client)/profile.tsx` e `/(courier)/profile.tsx`), sob a seção de configurações da conta e protegido por confirmação prévia via `Alert.alert`.
- **Proibição**: NUNCA poluir os Dashboards principais ou Headers com botões de logout, garantindo uma interface limpa, focada no fluxo de trabalho operacional e livre de cliques acidentais.

