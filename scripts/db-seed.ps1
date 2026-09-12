Write-Host "🌱 [ZARPA] Populando banco de dados com migrações e seeders..." -ForegroundColor Cyan

# 1. Garantir que containers estão rodando
docker compose up -d

# 2. Executar migrate:fresh com seed
Write-Host "🔄 Executando migrate:fresh --seed..." -ForegroundColor Yellow
docker exec -i zarpa_backend php artisan migrate:fresh --seed

Write-Host ""
Write-Host "✅ Banco de dados populado com sucesso!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "👑 Admin:      admin@zarpa.com.br      (senha: admin123456)" -ForegroundColor White
Write-Host "🏪 Lojista:    lojista@zarpa.com.br    (senha: lojista123456)" -ForegroundColor White
Write-Host "🛵 Entregador: entregador@zarpa.com.br (senha: entregador123456)" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Green
