Write-Host "🚀 [ZARPA] Inicializando ambiente de desenvolvimento..." -ForegroundColor Cyan

# 1. Iniciar containers Docker
Write-Host "📦 Subindo containers Docker (PostgreSQL/PostGIS + Backend)..." -ForegroundColor Yellow
docker compose up -d

# 2. Aguardar verificação
Start-Sleep -Seconds 2

# 3. Informações dos usuários de teste
Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "⚡ ZARPA - USUÁRIOS DE TESTE PRÉ-CONFIGURADOS" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "👑 Admin:      admin@zarpa.com.br      (senha: admin123456)" -ForegroundColor White
Write-Host "🏪 Lojista:    lojista@zarpa.com.br    (senha: lojista123456)" -ForegroundColor White
Write-Host "🛵 Entregador: entregador@zarpa.com.br (senha: entregador123456)" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""

# 4. Iniciar Mobile com Expo
Write-Host "📱 Iniciando aplicativo React Native com Expo..." -ForegroundColor Cyan
Set-Location -Path "mobile"
npx expo start
