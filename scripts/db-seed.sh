#!/usr/bin/env bash
set -e

echo "🌱 [ZARPA] Populando banco de dados com migrações e seeders..."

# 1. Verificar se Docker Desktop / WSL está rodando
if ! docker info > /dev/null 2>&1; then
  echo ""
  echo "❌ [ERRO] O Docker Desktop ou WSL não está em execução no Windows!"
  echo "👉 Por favor, abra o aplicativo Docker Desktop e aguarde a inicialização da engine antes de continuar."
  echo ""
  exit 1
fi

# 2. Garantir que containers estão rodando
docker compose up -d

# 3. Executar migrate:fresh com seed
echo "🔄 Executando migrate:fresh --seed..."
docker exec -i zarpa_backend php artisan migrate:fresh --seed

echo ""
echo "✅ Banco de dados populado com sucesso!"
echo "=================================================="
echo "👑 Admin:      admin@zarpa.com.br      (senha: admin123456)"
echo "🏪 Lojista:    lojista@zarpa.com.br    (senha: lojista123456)"
echo "🛵 Entregador: entregador@zarpa.com.br (senha: entregador123456)"
echo "=================================================="
