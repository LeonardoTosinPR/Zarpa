# 📱 ZARPA Mobile - Aplicativo de Intermediação de Entregas Urbanas

> **Componente Curricular**: Desenvolvimento de Projetos para Dispositivos Móveis  
> **Curso**: Tecnologia em Sistemas para Internet | **Instituição**: UTFPR – Câmpus Guarapuava  
> **Autor**: Leonardo Tosin  
> **Projeto Integrado**: Trabalho de Conclusão de Curso 2 (TCC 2)  
> **Figma UI/UX**: [Protótipo e Design System no Figma](https://www.figma.com/design/TIzcx26iKkfJtdGsidStqD/zarpa-entregas?node-id=4-2&p=f)  

---

## 📌 1. Visão Geral do Aplicativo

O **Zarpa Mobile** é o aplicativo cliente multiplataforma (Android/iOS) desenvolvido com **React Native** e **Expo SDK 54**. O app materializa a interface de usuário e as regras de interação do sistema Zarpa, conectando dois perfis distintos de usuários com experiências e fluxos de telas personalizados:

1. **Lojista (Comércio Local)**: Cadastra entregas com geocodificação instantânea, seleciona entre modalidade Expressa ou Lote Econômico e acompanha o deslocamento em tempo real.
2. **Entregador (Courier)**: Recebe chamadas no radar express com trava anti-conflito, visualiza agendas de rotas agrupadas com paradas sequenciais e realiza transbordamento para navegadores GPS externos (Google Maps e Waze).

---

## 🎨 2. Design de Telas e Prototipação (Figma)

Todo o design visual, fluxos de navegação e componentes de interface foram modelados e prototipados no Figma:

🔗 **Acesse o Protótipo no Figma**: [zarpa-entregas (Figma Design)](https://www.figma.com/design/TIzcx26iKkfJtdGsidStqD/zarpa-entregas?node-id=4-2&p=f)

### Principais Fluxos Mapeados no Protótipo:
- **Fluxo de Onboarding e Autenticação**:
  - Telas de boas-vindas, login e cadastro com seleção de perfil de atuação (**Lojista** ou **Entregador**).
- **Fluxo do Lojista**:
  - Dashboard principal com resumo de pedidos ativos e histórico.
  - Formulário de postagem com busca inteligente de endereço e cálculo imediato de frete.
  - Seletor de modalidade: **Entrega Expressa** vs **Lote Econômico com Rateio 50/50**.
  - Mapa de rastreamento com visualização do status e posição do entregador.
  - Extrato financeiro com detalhamento da economia acumulada por rateio de lote.
- **Fluxo do Entregador**:
  - Radar de entregas expressas com contagem regressiva para aceitação.
  - Painel de Lotes Econômicos atribuídos com visualização do itinerário multi-paradas no mapa.
  - Checklist de execução da rota (Coleta -> Deslocamento -> Entrega confirmada).
  - Botão de ação rápida para navegação curva a curva via Deep Link (Google Maps / Waze).
  - Extrato de ganhos com distinção entre tarifa base e bônus de rateio 50/50.

---

## 🛠️ 3. Stack Tecnológica e Bibliotecas Mobile

| Categoria | Tecnologia / Biblioteca | Finalidade |
| :--- | :--- | :--- |
| **Framework Base** | [React Native](https://reactnative.dev/) (0.76+) | Criação de interface nativa multiplataforma |
| **Tooling & Runtime** | [Expo SDK 54](https://expo.dev/) (Expo Go compatível) | Ambiente de desenvolvimento, build e acesso a APIs nativas |
| **Roteamento** | [Expo Router (v4)](https://docs.expo.dev/router/introduction/) | Navegação estruturada por arquivos (*file-based routing*) com suporte a tipagem |
| **Linguagem** | [TypeScript](https://www.typescriptlang.org/) | Tipagem estrita de props, payloads de API e modelos de dados |
| **Estado e Cache de API** | [@tanstack/react-query](https://tanstack.com/query/latest) + [Axios](https://axios-http.com/) | Cache de requisições, mutações otimistas e revalidação de rede |
| **Armazenamento Seguro** | `expo-secure-store` | Persistência encriptada de tokens de autenticação (Sanctum Bearer Tokens) |
| **Mapas e Geoespacial** | `react-native-maps` + `expo-location` | Renderização de mapas vetoriais, marcação de pontos de coleta/entrega e GPS nativo |
| **Navegação Externa** | `expo-linking` | Deep linking nativo para abrir rotas no Google Maps (`geo:`) ou Waze (`waze://`) |
| **Gestos e Animações** | `react-native-reanimated` + `react-native-gesture-handler` | Transições fluidas de tela, modais e bottom sheets interativos |
| **Interface & Safe Area** | `react-native-safe-area-context` + `expo-status-bar` | Adaptação para entalhes (*notches*), dynamic island e barras de sistema |
| **Testes Unitários** | [Jest](https://jestjs.io/) + [React Native Testing Library](https://callstack.github.io/react-native-testing-library/) | Validação de componentes, hooks e lógica de apresentação |

---

## 📂 4. Arquitetura e Estrutura de Diretórios

A estrutura do projeto mobile segue as diretrizes do Expo Router combinadas com princípios de Clean Code e separação de responsabilidades:

```
mobile/
├── app/                          # Rotas e Telas do Aplicativo (Expo Router)
│   ├── _layout.tsx               # Root Layout com Provedores Globais (Auth, Theme, React Query)
│   ├── index.tsx                 # Tela de Splash / Redirecionamento condicional de Auth
│   ├── (auth)/                   # Grupo de telas públicas de autenticação
│   │   ├── login.tsx             # Login do usuário
│   │   └── register.tsx          # Cadastro de Lojista ou Entregador
│   ├── (client)/                 # Grupo de rotas privadas do perfil Lojista
│   │   ├── _layout.tsx           # Tab Bar / Drawer do Lojista
│   │   ├── dashboard.tsx         # Visão geral de pedidos
│   │   ├── new-order.tsx         # Formulário de postagem de pedido com cálculo de frete
│   │   ├── tracking.tsx          # Acompanhamento do pedido no mapa
│   │   └── statement.tsx         # Extrato e economias do rateio
│   └── (courier)/                # Grupo de rotas privadas do perfil Entregador
│       ├── _layout.tsx           # Tab Bar / Drawer do Entregador
│       ├── radar.tsx             # Radar de pedidos expressos disponíveis
│       ├── routes.tsx            # Agenda de Lotes Econômicos e rotas multi-paradas
│       ├── delivery-detail.tsx   # Detalhe da entrega com transbordamento para GPS
│       └── statement.tsx         # Extrato de ganhos e bônus de rateio
├── src/
│   ├── components/               # Componentes UI reutilizáveis (Buttons, Cards, Inputs, MapView, Badges)
│   ├── context/                  # Contextos globais (AuthContext, ThemeContext, LocationContext)
│   ├── hooks/                    # Custom Hooks (useLocation, useOrders, useAuth, useRouteNavigation)
│   ├── services/                 # Clientes HTTP e serviços de API (api.ts, authService, orderService)
│   ├── types/                    # Definições de tipos TypeScript (User, Order, Route, Location, API)
│   ├── constants/                # Constantes de configuração (Theme, Colors, Endpoints, MapConfigs)
│   └── utils/                    # Funções utilitárias (formatação de moeda BRL, cálculos de distância, validações)
├── assets/                       # Recursos estáticos (Ícones, splash screen, pins de mapa)
├── __tests__/                    # Suíte de testes unitários e de integração de componentes
├── app.json                      # Configurações do Expo (nome, bundleId, permissões nativas)
├── babel.config.js               # Configuração do Babel e plugins de reanimated
├── jest.config.js                # Configuração do executor de testes Jest
├── package.json                  # Dependências e scripts do projeto mobile
└── tsconfig.json                 # Configurações do compilador TypeScript
```

---

## ⚡ 5. Guia de Execução Local

### Pré-requisitos
- **Node.js**: Versão 20+ ou 22 LTS
- **Gerenciador de Pacotes**: npm ou yarn
- **Dispositivo de Teste**:
  - Smartphone físico com o aplicativo **Expo Go** instalado ([Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) ou [Apple App Store](https://apps.apple.com/app/expo-go/id982107779)); OU
  - **Android Studio** com Android Emulator configurado (Imagem com Google Play Services).

---

### Instalação das Dependências

Na raiz da pasta `mobile/`:
```bash
npm install
```

---

### Inicialização do Servidor de Desenvolvimento (Metro Bundler)

```bash
npx expo start
```

Após iniciar:
- **No Emulador Android**: Pressione a tecla `a` no terminal (o emulador deve estar em execução).
- **No Dispositivo Físico**: Abra o **Expo Go** e escaneie o QR Code exibido no terminal.
- **Limpeza de Cache (se necessário)**:
  ```bash
  npx expo start -c
  ```

---

### Configuração de Comunicação com o Backend

O app consome a API RESTful Laravel. Certifique-se de configurar a URL base no arquivo de ambiente/configuração:
- **Emulador Android**: Use `http://10.0.2.2:8000/api/v1` (o alias `10.0.2.2` aponta para o `localhost` da máquina hospedeira).
- **Dispositivo Físico (Expo Go)**: Use o IP local da sua máquina na mesma rede Wi-Fi (ex: `http://192.168.1.50:8000/api/v1`).

---

## 🧪 6. Execução de Testes Automatizados

Os testes do aplicativo utilizam **Jest** e **React Native Testing Library (RNTL)**:

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch (desenvolvimento contínuo)
npm test -- --watch

# Executar com relatório de cobertura de código
npm test -- --coverage
```

---

## 📐 7. Boas Práticas de Desenvolvimento Mobile Adotadas

1. **Design Responsivo & Safe Area**:
   - Uso de `SafeAreaView` e `useSafeAreaInsets` para garantir adaptação perfeita a qualquer proporção de tela e entalhe.
2. **Acessibilidade e Usabilidade**:
   - Áreas de toque adequadas (mínimo de 48x48 dp para botões e links).
   - Contraste de cores validado conforme as diretrizes WCAG.
   - Textos escaláveis e suporte a leitor de tela nativo (`accessible`, `accessibilityLabel`).
3. **Tratamento de Estados Assíncronos & Feedback Visual**:
   - Estados de *loading* com esqueletos visuais (*skeleton loaders*) e indicadores de progresso.
   - *Error boundaries* e tratamento gracioso de falhas de conectividade com revalidação automática via React Query.
4. **Gerenciamento de Permissões**:
   - Solicitação consciente e contextual de permissão de geolocalização (`expo-location`) em primeiro plano.
5. **Transbordamento GPS sem Custo Adicional**:
   - Uso de *Deep Linking* para acionar navegadores já instalados no sistema operacional (Google Maps e Waze), reduzindo a sobrecarga do app e garantindo instruções de voz completas ao motorista.

---

## 🔗 Referências e Links Úteis
- 🏠 [README Principal do Projeto Zarpa (Monorepo)](file:///d:/Zarpa/README.md)
- 🎨 [Figma do Projeto Zarpa](https://www.figma.com/design/TIzcx26iKkfJtdGsidStqD/zarpa-entregas?node-id=4-2&p=f)
- 📐 [Documento de Arquitetura de Software](file:///d:/Zarpa/docs/ARQUITETURA.md)
- 📅 [Plano Mestre de Sprints (MASTER_PLAN.md)](file:///d:/Zarpa/docs/MASTER_PLAN.md)

