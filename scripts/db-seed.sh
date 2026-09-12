#!/usr/bin/env bash
set -e

echo "🌱 [ZARPA] Populando banco de dados com migrações e seeders..."

# 1. Garantir que containers estão rodando
docker compose up -d

# 2. Executar migrate:fresh com seed
echo "🔄 Executando migrate:fresh --seed..."
docker exec -i zarpa_backend php artisan migrate:fresh --seed

echo ""
echo "✅ Banco de dados populado com sucesso!"
echo "=================================================="
echo "👑 Admin:      admin@zarpa.com.br      (senha: admin123456)"
echo "🏪 Lojista:    lojista@zarpa.com.br    (senha: lojista123456)"
echo "🛵 Entregador: entregador@zarpa.com.br (senha: entregador123456)"
echo "=================================================="
