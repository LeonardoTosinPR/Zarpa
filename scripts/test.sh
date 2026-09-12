#!/usr/bin/env bash
set -e

echo "🧪 [ZARPA] Executando suíte completa de testes..."
echo ""

# 1. Verificar se Docker Desktop / WSL está rodando
if ! docker info > /dev/null 2>&1; then
  echo ""
  echo "❌ [ERRO] O Docker Desktop ou WSL não está em execução no Windows!"
  echo "👉 Por favor, abra o aplicativo Docker Desktop e aguarde a inicialização da engine antes de continuar."
  echo ""
  exit 1
fi

# 2. Backend Pest Tests
echo "=================================================="
echo "🐘 1. Executando Testes do Backend (Laravel + Pest v3)"
echo "=================================================="
docker compose up -d
docker exec -i zarpa_backend php artisan test

echo ""
# 3. Mobile TypeScript Typecheck
echo "=================================================="
echo "📘 2. Verificando Tipos TypeScript no Mobile"
echo "=================================================="
cd mobile
npx tsc --noEmit
echo "✓ Tipagem TypeScript 100% válida!"

echo ""
# 4. Mobile Jest Tests
echo "=================================================="
echo "⚛️  3. Executando Testes Unitários do Mobile (Jest + RNTL)"
echo "=================================================="
npm test

echo ""
echo "🎉 Todos os testes passaram com 100% de sucesso!"
