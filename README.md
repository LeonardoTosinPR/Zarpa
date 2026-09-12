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
│   └── README.md             # Documentação específica de Mobile & UI/UX Figma
├── docs/                     # Documentação viva de engenharia
│   ├── MASTER_PLAN.md        # Visão executiva e matriz MoSCoW/RICE
│   ├── ARQUITETURA.md        # Especificação arquitetural, fluxos e DER
│   └── sprints/              # Detalhamento granular das sprints (sprint_0.md, sprint_1.md...)
├── scripts/                  # Scripts utilitários de automação (Bash & PowerShell)
│   ├── dev.sh / dev.ps1      # Inicialização completa do ambiente (Docker + Expo)
│   ├── db-seed.sh / .ps1     # Reset e população do banco com dados de teste
│   └── test.sh / .ps1        # Execução completa da suíte de testes (Pest + Jest + TypeScript)
├── .maestro/                 # Suíte de Testes End-to-End (E2E) em YAML
├── docker-compose.yml        # Orquestração PostgreSQL 16 + PostGIS e Backend
└── README.md
```

---

## ⚡ Guia Rápido de Execução

### 1. Pré-requisitos
- **Docker Desktop** (com engine WSL 2 ativa no Windows);
- **Node.js** (v20+ ou v22 LTS) e npm;
- **Expo Go** no smartphone físico (Android/iOS) ou **Emulador Android** configurado.

> ⚠️ **Importante (Windows)**: Certifique-se de que o **Docker Desktop** está aberto e em execução antes de rodar os comandos. Os scripts verificam automaticamente a engine do Docker.

---

### 2. Executando o App via Scripts de Automação (Recomendado)

Na raiz do projeto (`d:\Zarpa`), execute o script correspondente ao seu terminal:

#### 🚀 Iniciar o Aplicativo Completo (Docker + Mobile)
Sobe os containers do PostgreSQL/PostGIS e do Backend Laravel, exibe as credenciais de teste e inicia o servidor do Expo:

- **No Bash / Git Bash / WSL**:
  ```bash
  bash scripts/dev.sh
  ```
- **No PowerShell**:
  ```powershell
  .\scripts\dev.ps1
  ```

---

#### 🌱 Resetar e Popular o Banco de Dados (Seeders)
Recria as tabelas e popula o usuário Admin e os usuários de teste de Guarapuava:

- **No Bash / Git Bash**:
  ```bash
  bash scripts/db-seed.sh
  ```
- **No PowerShell**:
  ```powershell
  .\scripts\db-seed.ps1
  ```

---

#### 🧪 Executar Todos os Testes Automatizados
Roda os testes do Backend (**Pest v3**), checagem de tipos (**TypeScript**) e testes unitários do Mobile (**Jest + RNTL**):

- **No Bash / Git Bash**:
  ```bash
  bash scripts/test.sh
  ```
- **No PowerShell**:
  ```powershell
  .\scripts\test.ps1
  ```

---

## 🔑 Usuários de Teste Pré-Configurados (Sprint 1)

O banco de dados é populado com 3 contas prontas para homologação:

| Perfil | E-mail | Senha | Detalhes no Sistema |
| :--- | :--- | :--- | :--- |
| 👑 **Admin Master** | `admin@zarpa.com.br` | `admin123456` | Acesso total e alternância entre painéis |
| 🏪 **Lojista Teste** | `lojista@zarpa.com.br` | `lojista123456` | *Padaria Central Guarapuava* (CNPJ `12.345.678/0001-90`) |
| 🛵 **Entregador Teste** | `entregador@zarpa.com.br` | `entregador123456` | *Carlos Motoboy* (Moto Honda CG 160, Placa `BRA2E19`) |

> 💡 **Dica de Usabilidade**: Na tela de Boas-Vindas e Login do App Mobile, você pode clicar nos botões de atalho rápido (**[👑 Admin]**, **[🏪 Lojista]** ou **[🛵 Entregador]**) para entrar instantaneamente sem digitar credenciais.

---

## 🛠️ Execução Manual Passo a Passo

Caso prefira rodar cada componente individualmente em terminais separados:

### 1. Subir Infraestrutura Docker
```bash
docker compose up -d
docker exec -i zarpa_backend php artisan migrate:fresh --seed
```
- Endpoint de verificação da API: `http://localhost:8000/api/health`

### 2. Iniciar o App Mobile (Expo SDK 54)
```bash
cd mobile
npm install
npx expo start
```
- Pressione **`a`** para rodar no Emulador Android;
- Ou escaneie o QR Code no app **Expo Go** no celular.

---

## 🧪 Suíte de Testes Individuais

### Backend (Pest v3)
```bash
docker exec -i zarpa_backend php artisan test
```

### Mobile (Jest + RNTL)
```bash
cd mobile
npm test
```

### End-to-End (Maestro)
Com o emulador Android conectado e o app instalado:
```bash
maestro test .maestro/healthcheck.yaml
maestro test .maestro/auth_flow.yaml
```

---

## 📄 Documentação de Engenharia
- 📱 [`mobile/README.md`](file:///d:/Zarpa/mobile/README.md): Especificação de Mobile & UI/UX Figma.
- 🎨 [Protótipo no Figma](https://www.figma.com/design/TIzcx26iKkfJtdGsidStqD/zarpa-entregas?node-id=4-2&p=f): Design System e fluxos de telas.
- [`MASTER_PLAN.md`](file:///d:/Zarpa/docs/MASTER_PLAN.md): Visão executiva e cronograma das sprints.
- [`ARQUITETURA.md`](file:///d:/Zarpa/docs/ARQUITETURA.md): Arquitetura de software, DER e diagramas de fluxo.
- [`docs/sprints/sprint_1.md`](file:///d:/Zarpa/docs/sprints/sprint_1.md): Detalhamento e DoD da Sprint 1.
