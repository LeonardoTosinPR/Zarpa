#!/usr/bin/env bash
set -e

echo "🧪 [ZARPA] Executando suíte completa de testes..."
echo ""

# 1. Backend Pest Tests
echo "=================================================="
echo "🐘 1. Executando Testes do Backend (Laravel + Pest v3)"
echo "=================================================="
docker compose up -d
docker exec -i zarpa_backend php artisan test

echo ""
# 2. Mobile TypeScript Typecheck
echo "=================================================="
echo "📘 2. Verificando Tipos TypeScript no Mobile"
echo "=================================================="
cd mobile
npx tsc --noEmit
echo "✓ Tipagem TypeScript 100% válida!"

echo ""
# 3. Mobile Jest Tests
echo "=================================================="
echo "⚛️  3. Executando Testes Unitários do Mobile (Jest + RNTL)"
echo "=================================================="
npm test

echo ""
echo "🎉 Todos os testes passaram com 100% de sucesso!"
