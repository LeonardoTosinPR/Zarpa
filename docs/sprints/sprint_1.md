# SPRINT 1: Módulo de Atores, Autenticação e Perfis Isolados

- **Período**: 02/09/2026 a 09/09/2026 (8 dias)  
- **Branch Git**: `sprint/1-auth-perfis-atores`  
- **Requisitos Mapeados**: RF 01 (Must Have, RICE 6000), RNF 03 (Compatibilidade Multiplataforma)

---

## 1. Objetivos da Sprint

Implementar o sistema completo de registro, login e autorização com segmentação estrita entre os perfis de **Lojista (Cliente)** e **Entregador (Courier)** no backend e mobile, garantindo a criação de um usuário Administrador padrão com acesso irrestrito ao app, além de usuários de teste para lojista e entregador pré-configurados.

---

## 2. Backlog de Tarefas

### 2.1 Backend (Laravel 13)
- [x] Criar migrations para as tabelas:
  - `users` (id, name, email, password, role [client/courier/admin], phone).
  - `clients` (id, user_id, business_name, cnpj_cpf, default_address, default_lat, default_lng, default_location [Point 4326]).
  - `couriers` (id, user_id, cnh, vehicle_type, vehicle_plate, current_lat, current_lng, current_location [Point 4326], cluster_radius_km, is_online, is_active).
- [x] Criar `UserSeeder` / `DatabaseSeeder` com usuários padrão:
  - **Admin**: `admin@zarpa.com.br` (acesso total administrativo e navegação mestre no app).
  - **Lojista Teste**: `lojista@zarpa.com.br` (perfil `client` com comércio vinculado em Guarapuava).
  - **Entregador Teste**: `entregador@zarpa.com.br` (perfil `courier` com dados de CNH, moto e status online).
- [x] Configurar autenticação via **Laravel Sanctum** (Tokens de API seguros).
- [x] Implementar `AuthController`:
  - `POST /api/auth/register` (com dados condicionais para cliente ou entregador).
  - `POST /api/auth/login` (retorno de token e role do usuário).
  - `GET /api/auth/me` (perfil do usuário logado e relações).
  - `POST /api/auth/logout`.
- [x] Implementar Policies e Middlewares de isolamento de rotas (`EnsureUserIsClient`, `EnsureUserIsCourier`).
- [x] Criar testes com **Pest v3** (Unit/Feature):
  - Teste de registro de cliente e entregador com validações de campos obrigatórios.
  - Teste de login com credenciais válidas e inválidas.
  - Teste de login de administrador.
  - Teste de restrição de rota com tokens de papéis trocados.

### 2.2 Mobile (React Native / Expo SDK 54)
- [x] Criar Contexto de Autenticação (`AuthContext`) com integração ao `expo-secure-store`.
- [x] Implementar Telas de Acesso baseadas no protótipo do Figma:
  - Tela de Boas-Vindas e Escolha de Perfil (Lojista / Entregador / Acesso Rápido de Teste).
  - Tela de Login unificada com validação de formulário.
  - Telas de Cadastro dedicadas para Lojista e para Entregador.
- [x] Implementar Navegação Condicional baseada na role do usuário autenticado:
  - Rota protegida `(client)` direcionando para o dashboard do lojista.
  - Rota protegida `(courier)` direcionando para o dashboard do entregador.
  - Tratamento para acesso de administrador (visão geral ou seletor de perfil).
- [x] Implementar botão de logout e tela de visualização de perfil.
- [x] Testes unitários de componentes com Jest e RNTL (renderização, validação e submissão de formulários).

### 2.3 Testes End-to-End (Maestro)
- [x] Criar `/.maestro/auth_flow.yaml`:
  - Cenário 1: Cadastro de novo lojista e redirecionamento para o dashboard do cliente.
  - Cenário 2: Logout e login com conta de entregador, confirmando acesso ao dashboard do condutor.
  - Cenário 3: Validação de login com o usuário Admin.

---

## 3. Definition of Done (DoD)

- [x] Usuários conseguem se registrar e autenticar recebendo tokens Sanctum.
- [x] Usuário Admin e usuários de teste criados no banco de dados via Seeder.
- [x] O aplicativo redireciona automaticamente o lojista e o entregador para suas respectivas interfaces.
- [x] Testes Pest de autenticação e autorização rodando sem falhas (`php artisan test`).
- [x] Testes Jest do mobile passando com 100% de sucesso (`npm test`).
- [x] Fluxo `auth_flow.yaml` do Maestro executando com sucesso no emulador Android.
- [x] Commits realizados na branch `sprint/1-auth-perfis-atores` seguindo Conventional Commits.
