Write-Host "🌱 [ZARPA] Populando banco de dados com migrações e seeders..." -ForegroundColor Cyan

# 1. Verificar se Docker Desktop / WSL está rodando no Windows
docker info *>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ [ERRO] O Docker Desktop ou WSL não está em execução no Windows!" -ForegroundColor Red
    Write-Host "👉 Por favor, abra o aplicativo Docker Desktop e aguarde a inicialização da engine antes de continuar." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# 2. Garantir que containers estão rodando
docker compose up -d

# 3. Executar migrate:fresh com seed
Write-Host "🔄 Executando migrate:fresh --seed..." -ForegroundColor Yellow
docker exec -i zarpa_backend php artisan migrate:fresh --seed

Write-Host ""
Write-Host "✅ Banco de dados populado com sucesso!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "👑 Admin:      admin@zarpa.com.br      (senha: admin123456)" -ForegroundColor White
Write-Host "🏪 Lojista:    lojista@zarpa.com.br    (senha: lojista123456)" -ForegroundColor White
Write-Host "🛵 Entregador: entregador@zarpa.com.br (senha: entregador123456)" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Green
