#!/usr/bin/env bash
set -e

# ============================================================================
# FUNCOES DE OUTPUT FORMATADO
# ============================================================================

write_info() {
    echo -e "\033[0;36m[INFO]\033[0m $1"
}

write_success() {
    echo -e "\033[0;32m[OK]  \033[0m $1"
}

write_warning() {
    echo -e "\033[0;33m[WARN]\033[0m $1"
}

write_error() {
    echo -e "\033[0;31m[ERR] \033[0m $1"
}

write_header() {
    echo ""
    echo -e "\033[0;36m⚡ $1\033[0m"
    echo -e "\033[0;90m==================================================\033[0m"
}

# ============================================================================
# VALIDACOES E DIAGNOSTICO
# ============================================================================

test_docker_installed() {
    command -v docker >/dev/null 2>&1
}

test_docker_running() {
    docker info >/dev/null 2>&1
}

assert_docker_ready() {
    if ! test_docker_installed; then
        write_error "Docker NÃO está instalado no sistema!"
        echo "SOLUÇÃO: Baixe e instale o Docker Desktop: https://www.docker.com/products/docker-desktop"
        exit 1
    fi

    if ! test_docker_running; then
        write_error "Docker Desktop ou engine WSL2 NÃO está em execução!"
        echo "SOLUÇÃO: Inicie o aplicativo Docker Desktop e aguarde a inicialização da engine."
        exit 1
    fi
}

show_test_credentials() {
    echo ""
    echo -e "\033[0;32m==================================================\033[0m"
    echo -e "\033[0;32m⚡ ZARPA - USUÁRIOS DE TESTE PRÉ-CONFIGURADOS\033[0m"
    echo -e "\033[0;32m==================================================\033[0m"
    echo "👑 Admin Master:     admin@zarpa.com.br      (senha: admin123456)"
    echo "🏪 Lojista Teste:    lojista@zarpa.com.br    (senha: lojista123456)"
    echo "🛵 Entregador Teste: entregador@zarpa.com.br (senha: entregador123456)"
    echo -e "\033[0;32m==================================================\033[0m"
    echo ""
}

show_diagnostics() {
    write_header "Diagnóstico do Ambiente ZARPA (Docker / WSL / Node)"

    if test_docker_installed; then
        write_success "Docker instalado: $(docker --version)"
    else
        write_error "Docker NÃO está instalado"
        return 1
    fi

    if test_docker_running; then
        write_success "Docker daemon / WSL engine está em execução"
    else
        write_error "Docker daemon NÃO está rodando (abra o Docker Desktop)"
        return 1
    fi

    if command -v node >/dev/null 2>&1; then
        write_success "Node.js $(node -v) e npm $(npm -v) disponíveis"
    else
        write_warning "Node.js não encontrado no PATH"
    fi

    if [ ! -f "backend/.env" ]; then
        if [ -f "backend/.env.example" ]; then
            cp "backend/.env.example" "backend/.env"
            write_success "backend/.env criado a partir de .env.example"
        fi
    else
        write_success "Configuração backend/.env validada"
    fi

    write_success "Diagnóstico concluído com sucesso!"
}

show_usage() {
    write_header "ZARPA CLI - Comandos Disponíveis"
    echo ""
    echo "APLICAÇÃO & DESENVOLVIMENTO:"
    echo "  ./run.sh dev               - Inicia Docker (PostGIS + Backend) e o App Mobile (Expo)"
    echo "  ./run.sh up [args]         - Sobe os containers Docker em segundo plano (-d)"
    echo "  ./run.sh down [args]       - Para os containers Docker"
    echo "  ./run.sh restart           - Reinicia os containers Docker"
    echo "  ./run.sh mobile            - Inicia apenas o servidor Expo Mobile"
    echo ""
    echo "BANCO DE DADOS & SEEDERS:"
    echo "  ./run.sh db:populate       - Executa migrations e popula usuários de teste"
    echo "  ./run.sh db:reset          - Limpa (migrate:fresh) e repopula todo o banco"
    echo ""
    echo "TESTES & QUALIDADE:"
    echo "  ./run.sh test              - Executa todos os testes (Pest + Jest + TypeScript)"
    echo "  ./run.sh test:backend      - Executa apenas testes do Laravel (Pest v3)"
    echo "  ./run.sh test:mobile       - Executa apenas testes unitários do Mobile (Jest)"
    echo "  ./run.sh test:e2e          - Executa testes End-to-End com Maestro"
    echo ""
    echo "UTILITÁRIOS & DIAGNÓSTICO:"
    echo "  ./run.sh diagnostic        - Verifica Docker Desktop, WSL2, PostGIS e Node.js"
    echo "  ./run.sh users             - Exibe credenciais das contas de teste"
    echo "  ./run.sh help              - Exibe esta mensagem de ajuda"
    echo ""
}

# ============================================================================
# MAIN
# ============================================================================

COMMAND="$1"
shift || true

case "$COMMAND" in
    dev)
        assert_docker_ready
        write_info "Subindo infraestrutura Docker..."
        docker compose up -d
        sleep 2
        show_test_credentials
        write_info "Iniciando aplicativo React Native com Expo..."
        cd mobile && npx expo start
        ;;

    up)
        assert_docker_ready
        write_info "Iniciando containers Docker..."
        docker compose up -d "$@"
        write_success "Containers iniciados!"
        ;;

    down)
        assert_docker_ready
        write_info "Parando containers Docker..."
        docker compose down "$@"
        write_success "Containers parados."
        ;;

    restart)
        assert_docker_ready
        write_info "Reiniciando containers..."
        docker compose down
        docker compose up -d
        write_success "Containers reiniciados."
        ;;

    mobile)
        write_info "Iniciando apenas o Mobile Expo..."
        cd mobile && npx expo start
        ;;

    db:populate)
        assert_docker_ready
        docker compose up -d
        write_info "Executando migrations e seeders..."
        docker exec -i zarpa_backend php artisan migrate --seed
        write_success "Banco de dados atualizado e populado!"
        show_test_credentials
        ;;

    db:reset)
        assert_docker_ready
        write_warning "Resetando banco de dados (migrate:fresh --seed)..."
        docker compose up -d
        docker exec -i zarpa_backend php artisan migrate:fresh --seed
        write_success "Banco de dados recriado e populado do zero!"
        show_test_credentials
        ;;

    test)
        assert_docker_ready
        write_header "Executando Suíte Completa de Testes ZARPA"
        echo ""
        write_info "1/3. Testes do Backend (Laravel 13 + Pest v3)..."
        docker compose up -d
        docker exec -i zarpa_backend php artisan test
        write_success "Testes do Backend aprovados!"

        echo ""
        write_info "2/3. Checagem de Tipos TypeScript (Mobile)..."
        (cd mobile && npx tsc --noEmit)
        write_success "Tipagem TypeScript 100% válida!"

        echo ""
        write_info "3/3. Testes Unitários do Mobile (Jest + RNTL)..."
        (cd mobile && npm test)
        write_success "Testes Unitários do Mobile aprovados!"

        echo ""
        write_success "🎉 Todos os testes passaram com 100% de sucesso!"
        ;;

    test:backend)
        assert_docker_ready
        docker compose up -d
        docker exec -i zarpa_backend php artisan test "$@"
        ;;

    test:mobile)
        (cd mobile && npx tsc --noEmit && npm test "$@")
        ;;

    test:e2e)
        maestro test .maestro/auth_flow.yaml
        ;;

    diagnostic)
        show_diagnostics
        ;;

    users)
        show_test_credentials
        ;;

    help|"")
        show_usage
        ;;

    *)
        write_error "Comando desconhecido: '$COMMAND'"
        show_usage
        exit 1
        ;;
esac
