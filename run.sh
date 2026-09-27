#!/usr/bin/env bash
set -e

# Impede execução com sudo (quebra permissões do desktop/Wayland e do Node)
if [ "$EUID" -eq 0 ]; then
    echo -e "\033[0;31m[ERR] \033[0mNÃO execute este script com 'sudo'!"
    echo "O Docker já está liberado para o seu usuário. Executar como root impede abrir janelas gráficas no seu desktop."
    echo "Execute simplesmente:"
    echo "  ./run.sh dev"
    exit 1
fi

# ============================================================================
# CONFIGURACAO DE AMBIENTE (ANDROID SDK)
# ============================================================================

# Auto-detecta e padroniza ANDROID_HOME
if [ -z "$ANDROID_HOME" ]; then
    if [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Android/Sdk"
    elif [ -d "$HOME/Android/sdk" ]; then
        export ANDROID_HOME="$HOME/Android/sdk"
    elif [ -d "/usr/lib/android-sdk" ]; then
        export ANDROID_HOME="/usr/lib/android-sdk"
    fi
fi

# Garante links e compatibilidade de maiúsculas/minúsculas para o Expo no Linux (~/Android/sdk)
if [ -d "$HOME/Android/Sdk" ] && [ ! -e "$HOME/Android/sdk" ]; then
    ln -sfn "$HOME/Android/Sdk" "$HOME/Android/sdk" 2>/dev/null || true
elif [ -d "$HOME/Android/sdk" ] && [ ! -e "$HOME/Android/Sdk" ]; then
    ln -sfn "$HOME/Android/sdk" "$HOME/Android/Sdk" 2>/dev/null || true
elif [ -d "/usr/lib/android-sdk/platform-tools" ] && [ ! -d "$HOME/Android/Sdk" ]; then
    mkdir -p "$HOME/Android/Sdk" 2>/dev/null || true
    ln -sfn /usr/lib/android-sdk/platform-tools "$HOME/Android/Sdk/platform-tools" 2>/dev/null || true
    ln -sfn "$HOME/Android/Sdk" "$HOME/Android/sdk" 2>/dev/null || true
fi

if [ -n "$ANDROID_HOME" ] && [ -d "$ANDROID_HOME" ]; then
    export ANDROID_SDK_ROOT="$ANDROID_HOME"
    export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin"
fi

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

test_docker_compose_installed() {
    docker compose version >/dev/null 2>&1
}

test_docker_running() {
    docker info >/dev/null 2>&1
}

assert_docker_ready() {
    if ! test_docker_installed; then
        write_error "Docker NÃO está instalado no sistema!"
        echo "SOLUÇÃO: Instale o Docker Engine para Linux: https://docs.docker.com/engine/install/"
        exit 1
    fi

    if ! test_docker_compose_installed; then
        write_error "Plugin Docker Compose ('docker compose') NÃO está instalado!"
        echo "SOLUÇÃO: Instale o plugin docker-compose-plugin (ex: sudo apt install docker-compose-plugin ou equivalente na sua distribuição)."
        exit 1
    fi

    if ! test_docker_running; then
        write_error "O daemon do Docker NÃO está respondendo ou seu usuário não tem permissão de acesso ao socket!"
        echo "SOLUÇÃO:"
        echo "  • Se você acabou de instalar o Docker ou adicionar o grupo, execute no terminal: newgrp docker"
        echo "    (ou feche e abra uma nova janela de terminal / faça logout e login)."
        echo "  • Se o serviço estiver parado, inicie com: sudo systemctl start docker"
        echo "  • Para garantir seu usuário no grupo docker: sudo usermod -aG docker \$USER"
        exit 1
    fi
}

assert_mobile_ready() {
    if [ ! -d "mobile/node_modules" ]; then
        write_warning "Dependências do mobile não encontradas. Executando 'npm install' em mobile/..."
        (cd mobile && npm install)
    fi
}

assert_backend_ready() {
    if [ ! -f "backend/.env" ]; then
        if [ -f "backend/.env.example" ]; then
            cp "backend/.env.example" "backend/.env"
            write_success "backend/.env criado a partir de .env.example"
        fi
    fi

    if [ ! -f "backend/vendor/autoload.php" ]; then
        write_info "Dependências do backend não encontradas. Executando 'composer install' via container..."
        docker compose run --rm backend composer install --prefer-dist --no-interaction
        write_success "Dependências do Composer instaladas!"
    fi

    if [ -f "backend/.env" ] && ! grep -qE '^APP_KEY=base64:' backend/.env; then
        write_info "Gerando chave de aplicação do Laravel (APP_KEY)..."
        docker compose run --rm backend php artisan key:generate --force
        write_success "APP_KEY gerada com sucesso!"
    fi
}

wait_for_backend() {
    write_info "Aguardando backend estar pronto..."
    local attempts=0
    while [ "$(docker inspect -f '{{.State.Running}}' zarpa_backend 2>/dev/null)" != "true" ] || [ "$(docker inspect -f '{{.State.Restarting}}' zarpa_backend 2>/dev/null)" = "true" ]; do
        attempts=$((attempts + 1))
        if [ $attempts -ge 30 ]; then
            write_error "Timeout aguardando inicialização do container zarpa_backend!"
            docker logs zarpa_backend --tail 20
            exit 1
        fi
        sleep 1
    done
}

setup_android_usb_reverse() {
    if command -v adb >/dev/null 2>&1; then
        local attached
        attached=$(adb devices 2>/dev/null | grep -E '\bdevice$' | awk '{print $1}')
        if [ -n "$attached" ]; then
            for dev in $attached; do
                adb -s "$dev" reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true
                adb -s "$dev" reverse tcp:8000 tcp:8000 >/dev/null 2>&1 || true
            done
            write_success "Dispositivo Android USB detectado! Portas 8081 (Metro) e 8000 (API Laravel) mapeadas via 'adb reverse'."
            return 0
        fi
    fi
    return 1
}

open_mobile_terminal() {
    local mobile_dir
    mobile_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/mobile" && pwd)"

    # Restaura variáveis de sessão D-Bus e XDG caso o shell tenha sido iniciado via newgrp ou subshell
    local uid
    uid="$(id -u)"
    if [ -z "$XDG_RUNTIME_DIR" ] && [ -d "/run/user/$uid" ]; then
        export XDG_RUNTIME_DIR="/run/user/$uid"
    fi
    if [ -z "$DBUS_SESSION_BUS_ADDRESS" ]; then
        if [ -e "/run/user/$uid/bus" ]; then
            export DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$uid/bus"
        elif [ -S "/run/user/$uid/bus" ]; then
            export DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$uid/bus"
        fi
    fi
    if [ -z "$DISPLAY" ] && [ -z "$WAYLAND_DISPLAY" ]; then
        if [ -e "/tmp/.X11-unix/X0" ]; then
            export DISPLAY=":0"
        fi
    fi

    # Configura USB / adb reverse se dispositivo conectado
    local expo_args="$*"
    if [ -z "$expo_args" ]; then
        if setup_android_usb_reverse; then
            expo_args="--localhost"
        fi
    fi

    write_info "Abrindo o Expo Mobile em uma janela separada do bash ($expo_args)..."

    local terminal_cmd="cd '$mobile_dir' && npx expo start $expo_args; echo ''; echo 'Sessão do Expo encerrada.'; exec bash"

    local dbus_wrap=""
    if [ -z "$DBUS_SESSION_BUS_ADDRESS" ] && command -v dbus-run-session >/dev/null 2>&1; then
        dbus_wrap="dbus-run-session --"
    fi

    # Tenta abrir em um emulador de terminal gráfico disponível
    local term_opened=false
    if [ -n "$DISPLAY" ] || [ -n "$WAYLAND_DISPLAY" ] || [ -n "$XDG_RUNTIME_DIR" ]; then
        if command -v gnome-terminal >/dev/null 2>&1; then
            $dbus_wrap gnome-terminal --title="ZARPA Mobile (Expo)" -- bash -c "$terminal_cmd" >/dev/null 2>&1 &
            term_opened=true
            write_success "Expo Mobile iniciado em uma nova janela (GNOME Terminal)!"
        elif command -v xterm >/dev/null 2>&1; then
            xterm -title "ZARPA Mobile (Expo)" -e bash -c "$terminal_cmd" >/dev/null 2>&1 &
            term_opened=true
            write_success "Expo Mobile iniciado em uma nova janela (XTerm)!"
        elif command -v konsole >/dev/null 2>&1; then
            konsole -e bash -c "$terminal_cmd" >/dev/null 2>&1 &
            term_opened=true
            write_success "Expo Mobile iniciado em uma nova janela (Konsole)!"
        elif command -v xfce4-terminal >/dev/null 2>&1; then
            xfce4-terminal -e "bash -c \"$terminal_cmd\"" >/dev/null 2>&1 &
            term_opened=true
            write_success "Expo Mobile iniciado em uma nova janela (XFCE Terminal)!"
        elif command -v alacritty >/dev/null 2>&1; then
            alacritty -e bash -c "$terminal_cmd" >/dev/null 2>&1 &
            term_opened=true
            write_success "Expo Mobile iniciado em uma nova janela (Alacritty)!"
        elif command -v kitty >/dev/null 2>&1; then
            kitty bash -c "$terminal_cmd" >/dev/null 2>&1 &
            term_opened=true
            write_success "Expo Mobile iniciado em uma nova janela (Kitty)!"
        elif command -v ptyxis >/dev/null 2>&1; then
            local err_log="/tmp/ptyxis_zarpa_$$.log"
            $dbus_wrap ptyxis --new-window -- bash -c "$terminal_cmd" >/dev/null 2>"$err_log" &
            local p_pid=$!
            sleep 0.5
            if kill -0 "$p_pid" 2>/dev/null; then
                term_opened=true
                write_success "Expo Mobile iniciado em uma nova janela (Ptyxis)!"
            elif [ -s "$err_log" ] && grep -qiE "failed|error" "$err_log"; then
                write_warning "Ptyxis não conseguiu abrir uma janela separada:"
                cat "$err_log"
                rm -f "$err_log"
            else
                term_opened=true
                write_success "Expo Mobile iniciado em uma nova janela (Ptyxis)!"
                rm -f "$err_log"
            fi
        fi
    fi

    if [ "$term_opened" = true ]; then
        return 0
    fi

    write_warning "Não foi possível abrir janela gráfica separada. Iniciando Expo no terminal atual..."
    (cd "$mobile_dir" && npx expo start $expo_args)
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
    write_header "Diagnóstico do Ambiente ZARPA (Docker / Node)"

    if test_docker_installed; then
        write_success "Docker instalado: $(docker --version)"
    else
        write_error "Docker NÃO está instalado"
        return 1
    fi

    if test_docker_compose_installed; then
        write_success "Docker Compose disponível: $(docker compose version)"
    else
        write_warning "Docker Compose plugin não encontrado ('docker compose')"
    fi

    if test_docker_running; then
        write_success "Docker daemon está em execução"
    else
        write_error "Docker daemon NÃO está rodando (inicie com: sudo systemctl start docker ou verifique se o usuário está no grupo docker)"
        return 1
    fi

    if command -v node >/dev/null 2>&1; then
        write_success "Node.js $(node -v) e npm $(npm -v) disponíveis"
    else
        write_warning "Node.js não encontrado no PATH"
    fi

    if [ -d "mobile/node_modules" ]; then
        write_success "Dependências do Mobile instaladas (mobile/node_modules)"
    else
        write_warning "Dependências do Mobile NÃO instaladas (execute: cd mobile && npm install)"
    fi

    if [ -f "backend/vendor/autoload.php" ]; then
        write_success "Dependências do Backend instaladas (backend/vendor)"
    else
        write_warning "Dependências do Backend NÃO instaladas (serão instaladas automaticamente pelo run.sh)"
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
    echo "  ./run.sh dev               - Inicia Docker (PostGIS + Backend) e abre o Expo Mobile em nova janela"
    echo "  ./run.sh up [args]         - Sobe os containers Docker em segundo plano (-d)"
    echo "  ./run.sh down [args]       - Para os containers Docker"
    echo "  ./run.sh restart           - Reinicia os containers Docker"
    echo "  ./run.sh mobile [-w]       - Inicia apenas o servidor Expo Mobile (-w abre em nova janela)"
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
    echo "  ./run.sh diagnostic        - Verifica Docker, Node.js e variáveis de ambiente"
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
        assert_backend_ready
        assert_mobile_ready
        write_info "Subindo infraestrutura Docker..."
        docker compose up -d
        sleep 2
        show_test_credentials
        open_mobile_terminal
        ;;

    up)
        assert_docker_ready
        assert_backend_ready
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
        assert_backend_ready
        write_info "Reiniciando containers..."
        docker compose down
        docker compose up -d
        write_success "Containers reiniciados."
        ;;

    mobile)
        assert_mobile_ready
        if [ "$1" = "--new-window" ] || [ "$1" = "-w" ]; then
            shift
            open_mobile_terminal "$@"
        else
            local expo_args="$*"
            if [ -z "$expo_args" ]; then
                if setup_android_usb_reverse; then
                    expo_args="--localhost"
                fi
            fi
            write_info "Iniciando apenas o Mobile Expo ($expo_args)..."
            cd mobile && npx expo start $expo_args
        fi
        ;;

    db:populate)
        assert_docker_ready
        assert_backend_ready
        docker compose up -d
        wait_for_backend
        write_info "Executando migrations e seeders..."
        docker exec -i zarpa_backend php artisan migrate --seed
        write_success "Banco de dados atualizado e populado!"
        show_test_credentials
        ;;

    db:reset)
        assert_docker_ready
        assert_backend_ready
        write_warning "Resetando banco de dados (migrate:fresh --seed)..."
        docker compose up -d
        wait_for_backend
        docker exec -i zarpa_backend php artisan migrate:fresh --seed
        write_success "Banco de dados recriado e populado do zero!"
        show_test_credentials
        ;;

    test)
        assert_docker_ready
        assert_backend_ready
        assert_mobile_ready
        write_header "Executando Suíte Completa de Testes ZARPA"
        echo ""
        write_info "1/3. Testes do Backend (Laravel 13 + Pest v3)..."
        docker compose up -d
        wait_for_backend
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
        assert_backend_ready
        docker compose up -d
        wait_for_backend
        docker exec -i zarpa_backend php artisan test "$@"
        ;;

    test:mobile)
        assert_mobile_ready
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
