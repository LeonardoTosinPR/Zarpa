#!/usr/bin/env bash
set -e

echo "🚀 [ZARPA] Inicializando ambiente de desenvolvimento..."

# 1. Iniciar containers Docker (Postgres + PostGIS + Laravel Backend)
echo "📦 Subindo containers Docker (PostgreSQL/PostGIS + Backend)..."
docker compose up -d

# 2. Aguardar container backend responder
echo "⏳ Verificando integridade da API..."
sleep 2

# 3. Informações dos usuários de teste
echo ""
echo "=================================================="
echo "⚡ ZARPA - USUÁRIOS DE TESTE PRÉ-CONFIGURADOS"
echo "=================================================="
echo "👑 Admin:      admin@zarpa.com.br      (senha: admin123456)"
echo "🏪 Lojista:    lojista@zarpa.com.br    (senha: lojista123456)"
echo "🛵 Entregador: entregador@zarpa.com.br (senha: entregador123456)"
echo "=================================================="
echo ""

# 4. Iniciar Mobile com Expo
echo "📱 Iniciando aplicativo React Native com Expo..."
cd mobile
npx expo start
