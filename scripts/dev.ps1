Write-Host "🚀 [ZARPA] Inicializando ambiente de desenvolvimento..." -ForegroundColor Cyan

# 1. Verificar se Docker Desktop / WSL está rodando no Windows
docker info *>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ [ERRO] O Docker Desktop ou WSL não está em execução no Windows!" -ForegroundColor Red
    Write-Host "👉 Por favor, abra o aplicativo Docker Desktop e aguarde a inicialização da engine antes de continuar." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# 2. Iniciar containers Docker
Write-Host "📦 Subindo containers Docker (PostgreSQL/PostGIS + Backend)..." -ForegroundColor Yellow
docker compose up -d

# 3. Aguardar verificação
Start-Sleep -Seconds 2

# 4. Informações dos usuários de teste
Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "⚡ ZARPA - USUÁRIOS DE TESTE PRÉ-CONFIGURADOS" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "👑 Admin:      admin@zarpa.com.br      (senha: admin123456)" -ForegroundColor White
Write-Host "🏪 Lojista:    lojista@zarpa.com.br    (senha: lojista123456)" -ForegroundColor White
Write-Host "🛵 Entregador: entregador@zarpa.com.br (senha: entregador123456)" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""

# 5. Iniciar Mobile com Expo
Write-Host "📱 Iniciando aplicativo React Native com Expo..." -ForegroundColor Cyan
Set-Location -Path "mobile"
npx expo start
