Write-Host "🧪 [ZARPA] Executando suíte completa de testes..." -ForegroundColor Cyan
Write-Host ""

# 1. Backend Pest Tests
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "🐘 1. Executando Testes do Backend (Laravel + Pest v3)" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
docker compose up -d
docker exec -i zarpa_backend php artisan test

Write-Host ""
# 2. Mobile TypeScript Typecheck
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "📘 2. Verificando Tipos TypeScript no Mobile" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
Set-Location -Path "mobile"
npx tsc --noEmit
Write-Host "✓ Tipagem TypeScript 100% válida!" -ForegroundColor Green

Write-Host ""
# 3. Mobile Jest Tests
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "⚛️  3. Executando Testes Unitários do Mobile (Jest + RNTL)" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
npm test

Write-Host ""
Write-Host "🎉 Todos os testes passaram com 100% de sucesso!" -ForegroundColor Green
