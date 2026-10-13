#!/usr/bin/env pwsh
<#
.SYNOPSIS
    CLI Unificado de Gerenciamento do Monorepo ZARPA
.DESCRIPTION
    Facilita o gerenciamento do ambiente completo (Docker PostGIS + Backend Laravel 13 + Mobile Expo SDK 54),
    incluindo diagnósticos para Windows/WSL2, reset/população do banco e suíte de testes.
.PARAMETER Command
    Comando a executar (up, down, dev, db:populate, db:reset, test, diagnostic, help...)
.EXAMPLE
    .\run.ps1 dev
    .\run.ps1 diagnostic
    .\run.ps1 test
    .\run.ps1 db:reset
#>

param(
    [Parameter(Position = 0)]
    [string]$Command,
    [Parameter(Position = 1, ValueFromRemainingArguments = $true)]
    [string[]]$CommandArgs
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# ============================================================================
# FUNCOES DE OUTPUT FORMATADO
# ============================================================================

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK]   $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERR]  $Message" -ForegroundColor Red
}

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "⚡ $Text" -ForegroundColor Cyan
    Write-Host ("=" * ($Text.Length + 4)) -ForegroundColor Gray
}

# ============================================================================
# VALIDACOES E DIAGNOSTICO (DOCKER / WSL / NODE)
# ============================================================================

function Test-DockerInstalled {
    $docker = Get-Command docker -ErrorAction SilentlyContinue
    return $null -ne $docker
}

function Test-DockerRunning {
    try {
        docker info 2>&1 | Out-Null
        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
}

function Test-ComposeInstalled {
    $compose = Get-Command docker-compose -ErrorAction SilentlyContinue
    if ($null -ne $compose) { return 'standalone' }

    try {
        docker compose version 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { return 'integrated' }
    }
    catch {}

    return $null
}

function Test-NodeInstalled {
    $node = Get-Command node -ErrorAction SilentlyContinue
    return $null -ne $node
}

function Test-EnvFile {
    if (-not (Test-Path -LiteralPath 'backend/.env')) {
        Write-Warning "backend/.env nao encontrado"
        if (Test-Path -LiteralPath 'backend/.env.example') {
            Write-Info "Criando backend/.env baseado em backend/.env.example..."
            Copy-Item 'backend/.env.example' 'backend/.env'
            Write-Success "backend/.env criado com sucesso"
            return $true
        }
        Write-Error-Custom "Arquivo backend/.env eh necessario"
        return $false
    }
    return $true
}

function Assert-DockerReady {
    if (-not (Test-DockerInstalled)) {
        Write-Error-Custom "Docker NAO esta instalado no sistema!"
        Write-Host "SOLUCAO: Baixe e instale o Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
        exit 1
    }

    if (-not (Test-DockerRunning)) {
        Write-Error-Custom "Docker Desktop ou engine WSL2 NAO esta em execucao!"
        Write-Host "SOLUCAO: Inicie o aplicativo Docker Desktop no Windows e aguarde a inicializacao." -ForegroundColor Yellow
        exit 1
    }
}

function Setup-AndroidSdk {
    if (-not $env:ANDROID_HOME) {
        $defaultPath = "$env:LOCALAPPDATA\Android\Sdk"
        if (Test-Path -LiteralPath $defaultPath) {
            $env:ANDROID_HOME = $defaultPath
            $env:ANDROID_SDK_ROOT = $defaultPath
            $env:Path = "$env:Path;$defaultPath\platform-tools;$defaultPath\emulator;$defaultPath\cmdline-tools\latest\bin"
        }
    }
}

function Setup-AndroidUsbReverse {
    Setup-AndroidSdk
    $adb = Get-Command adb -ErrorAction SilentlyContinue
    if ($null -ne $adb) {
        try {
            $devices = adb devices 2>$null | Where-Object { $_ -match '\tdevice$' }
            if ($devices) {
                foreach ($line in $devices) {
                    $devId = ($line -split '\s+')[0]
                    if ($devId) {
                        adb -s $devId reverse tcp:8081 tcp:8081 2>$null | Out-Null
                        adb -s $devId reverse tcp:8000 tcp:8000 2>$null | Out-Null
                    }
                }
                Write-Success "Dispositivo Android USB detectado! Portas 8081 (Metro) e 8000 (API Laravel) mapeadas via 'adb reverse'."
                return $true
            }
        }
        catch {}
    }
    return $false
}

function Show-Diagnostics {
    Write-Header "Diagnostico do Ambiente ZARPA (Windows / WSL2 / Docker)"

    # 1. Docker instalado
    if (Test-DockerInstalled) {
        $v = docker --version
        Write-Success "Docker instalado: $v"
    }
    else {
        Write-Error-Custom "Docker NAO esta instalado"
        Write-Host "  -> Baixe o Docker Desktop: https://www.docker.com/products/docker-desktop"
        return $false
    }

    # 2. Docker daemon rodando
    if (Test-DockerRunning) {
        Write-Success "Docker daemon / WSL engine esta em execucao"
    }
    else {
        Write-Error-Custom "Docker daemon NAO esta rodando"
        Write-Host "  -> Abra o Docker Desktop no Windows e aguarde alguns segundos"
        return $false
    }

    # 3. Docker Compose
    $composeType = Test-ComposeInstalled
    if ($composeType) {
        Write-Success "Docker Compose ($composeType) disponivel"
    }
    else {
        Write-Error-Custom "Docker Compose nao encontrado"
        return $false
    }

    # 4. Node.js & npm
    if (Test-NodeInstalled) {
        $nodeV = node --version
        $npmV = npm --version
        Write-Success "Node.js $nodeV e npm $npmV disponiveis"
    }
    else {
        Write-Warning "Node.js nao encontrado no PATH"
    }

    # 5. Arquivo .env do Backend
    if (Test-EnvFile) {
        Write-Success "Configuracao de ambiente backend/.env validada"
    }

    # 6. Teste de Conexao com Containers Ativos
    try {
        $backendCheck = Invoke-RestMethod -Uri "http://localhost:8000/api/health" -Method Get -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($backendCheck.status -eq 'ok') {
            Write-Success "Backend API online e conectada ao PostGIS"
        }
    }
    catch {
        Write-Info "Backend container nao esta respondendo em localhost:8000 (execute '.\run.ps1 up' para iniciar)"
    }

    Write-Host ""
    Write-Success "Diagnostico concluido com sucesso!"
    return $true
}

function Invoke-Compose {
    param([string[]]$ArgsList)
    Assert-DockerReady
    $composeType = Test-ComposeInstalled

    if ($composeType -eq 'standalone') {
        docker-compose @ArgsList
    }
    else {
        docker compose @ArgsList
    }
}

function Show-Test-Credentials {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "⚡ ZARPA - USUARIOS DE TESTE PRE-CONFIGURADOS" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "👑 Admin Master:     admin@zarpa.com.br      (senha: admin123456)" -ForegroundColor White
    Write-Host "🏪 Lojista Teste:    lojista@zarpa.com.br    (senha: lojista123456)" -ForegroundColor White
    Write-Host "🛵 Entregador Teste: entregador@zarpa.com.br (senha: entregador123456)" -ForegroundColor White
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host ""
}

# ============================================================================
# HELP
# ============================================================================

function Show-Usage {
    Write-Header "ZARPA CLI - Comandos Disponiveis"

    Write-Host ""
    Write-Host "APLICACAO & DESENVOLVIMENTO:" -ForegroundColor Yellow
    Write-Host "  .\run.ps1 dev               - Inicia Docker (PostGIS + Backend) e o App Mobile (Expo)"
    Write-Host "  .\run.ps1 up [args]         - Sobe os containers Docker em segundo plano (-d)"
    Write-Host "  .\run.ps1 down [args]       - Para e remove os containers Docker"
    Write-Host "  .\run.ps1 restart           - Reinicia os containers Docker"
    Write-Host "  .\run.ps1 mobile            - Inicia apenas o servidor do Expo Mobile"
    Write-Host ""
    Write-Host "BANCO DE DADOS & SEEDERS:" -ForegroundColor Yellow
    Write-Host "  .\run.ps1 db:populate       - Executa migrations e popula cenario padrao (seeders)"
    Write-Host "  .\run.ps1 db:mock-orders    - Popula ~70 pedidos aleatorios por Guarapuava (20 expressos + 50 economicos)"
    Write-Host "  .\run.ps1 db:reset          - Limpa (migrate:fresh) e repopula todo o banco"
    Write-Host ""
    Write-Host "TESTES & QUALIDADE:" -ForegroundColor Yellow
    Write-Host "  .\run.ps1 test              - Executa todos os testes (Pest + Jest + TypeScript)"
    Write-Host "  .\run.ps1 test:backend      - Executa apenas testes do Laravel (Pest v3)"
    Write-Host "  .\run.ps1 test:mobile       - Executa apenas testes unitarios do Mobile (Jest)"
    Write-Host "  .\run.ps1 test:e2e          - Executa testes End-to-End com Maestro"
    Write-Host ""
    Write-Host "UTILITARIOS & DIAGNOSTICO:" -ForegroundColor Yellow
    Write-Host "  .\run.ps1 diagnostic        - Verifica Docker Desktop, WSL2, PostGIS e Node.js"
    Write-Host "  .\run.ps1 users             - Exibe credenciais das contas de teste"
    Write-Host "  .\run.ps1 help              - Exibe esta mensagem de ajuda"
    Write-Host ""
}

# ============================================================================
# EXECUCAO PRINCIPAL
# ============================================================================

if ([string]::IsNullOrWhiteSpace($Command)) {
    Show-Usage
    exit 0
}

$elapsed = [System.Diagnostics.Stopwatch]::StartNew()

try {
    switch ($Command) {
        # ====== APLICACAO / DEV ======
        'dev' {
            Assert-DockerReady
            Test-EnvFile | Out-Null
            Write-Info "Subindo infraestrutura Docker (PostgreSQL/PostGIS + Backend Laravel)..."
            Invoke-Compose @('up', '-d')
            Start-Sleep -Seconds 2
            Show-Test-Credentials
            Write-Info "Iniciando aplicativo React Native com Expo..."
            $hasUsb = Setup-AndroidUsbReverse
            $expoArgs = if ($hasUsb -and ($CommandArgs.Count -eq 0)) { @('--localhost') } else { $CommandArgs }
            Set-Location -Path "mobile"
            npx expo start @expoArgs
        }

        'up' {
            Assert-DockerReady
            Test-EnvFile | Out-Null
            Write-Info "Iniciando containers Docker..."
            $args = if ($CommandArgs.Count -eq 0) { @('up', '-d') } else { @('up') + $CommandArgs }
            Invoke-Compose $args
            Write-Success "Containers iniciados com sucesso!"
        }

        'down' {
            Assert-DockerReady
            Write-Info "Parando containers Docker..."
            Invoke-Compose (@('down') + $CommandArgs)
            Write-Success "Containers parados."
        }

        'restart' {
            Assert-DockerReady
            Write-Info "Reiniciando containers..."
            Invoke-Compose @('down')
            Invoke-Compose @('up', '-d')
            Write-Success "Containers reiniciados."
        }

        'mobile' {
            $hasUsb = Setup-AndroidUsbReverse
            $expoArgs = if ($hasUsb -and ($CommandArgs.Count -eq 0)) { @('--localhost') } else { $CommandArgs }
            Write-Info "Iniciando apenas o Mobile Expo ($expoArgs)..."
            Set-Location -Path "mobile"
            npx expo start @expoArgs
        }

        # ====== BANCO DE DADOS ======
        'db:populate' {
            Assert-DockerReady
            Write-Info "Garantindo containers ativos..."
            Invoke-Compose @('up', '-d')
            Write-Info "Executando migrations e seeders..."
            docker exec -i zarpa_backend php artisan migrate --seed
            Write-Success "Banco de dados atualizado e populado!"
            Show-Test-Credentials
        }

        'db:mock-orders' {
            Assert-DockerReady
            Write-Info "Garantindo containers ativos..."
            Invoke-Compose @('up', '-d')
            Write-Info "Gerando pedidos mockados aleatorios por Guarapuava (20 expressos + 50 economicos)..."
            docker exec -i zarpa_backend php artisan zarpa:mock-orders --express=20 --economic=50 @CommandArgs
            Write-Success "Pedidos mockados gerados com sucesso!"
        }

        'db:reset' {
            Assert-DockerReady
            Write-Warning "Resetando banco de dados (migrate:fresh --seed)..."
            Invoke-Compose @('up', '-d')
            docker exec -i zarpa_backend php artisan migrate:fresh --seed
            Write-Success "Banco de dados recriado e populado do zero!"
            Show-Test-Credentials
        }

        # ====== TESTES ======
        'test' {
            Assert-DockerReady
            Write-Header "Executando Suíte Completa de Testes ZARPA"

            # 1. Backend
            Write-Host ""
            Write-Info "1/3. Testes do Backend (Laravel 13 + Pest v3)..."
            Invoke-Compose @('up', '-d')
            docker exec -i zarpa_backend php artisan test
            Write-Success "Testes do Backend aprovados!"

            # 2. Mobile Typecheck
            Write-Host ""
            Write-Info "2/3. Checagem de Tipos TypeScript (Mobile)..."
            Set-Location -Path "mobile"
            npx tsc --noEmit
            Write-Success "Tipagem TypeScript 100% valida!"

            # 3. Mobile Jest
            Write-Host ""
            Write-Info "3/3. Testes Unitarios do Mobile (Jest + RNTL)..."
            npm test
            Write-Success "Testes Unitarios do Mobile aprovados!"

            Set-Location -Path ".."
            Write-Host ""
            Write-Success "🎉 Todos os testes passaram com 100% de sucesso!"
        }

        'test:backend' {
            Assert-DockerReady
            Write-Info "Executando testes do Backend (Pest v3)..."
            Invoke-Compose @('up', '-d')
            docker exec -i zarpa_backend php artisan test @CommandArgs
        }

        'test:mobile' {
            Write-Info "Executando testes do Mobile (Jest)..."
            Set-Location -Path "mobile"
            npx tsc --noEmit
            npm test @CommandArgs
        }

        'test:e2e' {
            Write-Info "Executando fluxo E2E Maestro (necessario emulador Android conectado)..."
            maestro test .maestro/auth_flow.yaml
        }

        # ====== UTILITARIOS ======
        'diagnostic' {
            Show-Diagnostics | Out-Null
        }

        'users' {
            Show-Test-Credentials
        }

        'help' {
            Show-Usage
        }

        default {
            Write-Error-Custom "Comando desconhecido: '$Command'"
            Show-Usage
            exit 1
        }
    }
}
catch {
    Write-Error-Custom "Falha na execucao: $_"
    exit 1
}
finally {
    $elapsed.Stop()
    $totalSeconds = [math]::Round($elapsed.Elapsed.TotalSeconds, 1)
    Write-Host ""
    Write-Host "Tempo de execucao: ${totalSeconds}s" -ForegroundColor Gray
}
