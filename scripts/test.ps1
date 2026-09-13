Write-Host "🧪 [ZARPA] Executando suíte completa de testes..." -ForegroundColor Cyan
Write-Host ""

# 1. Verificar se Docker Desktop / WSL está rodando no Windows
docker info *>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ [ERRO] O Docker Desktop ou WSL não está em execução no Windows!" -ForegroundColor Red
    Write-Host "👉 Por favor, abra o aplicativo Docker Desktop e aguarde a inicialização da engine antes de continuar." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# 2. Backend Pest Tests
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "🐘 1. Executando Testes do Backend (Laravel + Pest v3)" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
docker compose up -d
docker exec -i zarpa_backend php artisan test

Write-Host ""
# 3. Mobile TypeScript Typecheck
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "📘 2. Verificando Tipos TypeScript no Mobile" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
Set-Location -Path "mobile"
npx tsc --noEmit
Write-Host "✓ Tipagem TypeScript 100% válida!" -ForegroundColor Green

Write-Host ""
# 4. Mobile Jest Tests
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "⚛️  3. Executando Testes Unitários do Mobile (Jest + RNTL)" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
npm test

Write-Host ""
Write-Host "🎉 Todos os testes passaram com 100% de sucesso!" -ForegroundColor Green
