#!/usr/bin/env bash
set -e

echo "🚀 [ZARPA] Inicializando ambiente de desenvolvimento..."

# 1. Verificar se Docker Desktop / WSL está rodando
if ! docker info > /dev/null 2>&1; then
  echo ""
  echo "❌ [ERRO] O Docker Desktop ou WSL não está em execução no Windows!"
  echo "👉 Por favor, abra o aplicativo Docker Desktop e aguarde a inicialização da engine antes de continuar."
  echo ""
  exit 1
fi

# 2. Iniciar containers Docker (Postgres + PostGIS + Laravel Backend)
echo "📦 Subindo containers Docker (PostgreSQL/PostGIS + Backend)..."
docker compose up -d

# 3. Aguardar container backend responder
echo "⏳ Verificando integridade da API..."
sleep 2

# 4. Informações dos usuários de teste
echo ""
echo "=================================================="
echo "⚡ ZARPA - USUÁRIOS DE TESTE PRÉ-CONFIGURADOS"
echo "=================================================="
echo "👑 Admin:      admin@zarpa.com.br      (senha: admin123456)"
echo "🏪 Lojista:    lojista@zarpa.com.br    (senha: lojista123456)"
echo "🛵 Entregador: entregador@zarpa.com.br (senha: entregador123456)"
echo "=================================================="
echo ""

# 5. Iniciar Mobile com Expo
echo "📱 Iniciando aplicativo React Native com Expo..."
cd mobile
npx expo start
