#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

step() {
  printf "\n${BLUE}==>${NC} %s\n" "$1"
}

ok() {
  printf "${GREEN}OK${NC} %s\n" "$1"
}

warn() {
  printf "${YELLOW}WARN${NC} %s\n" "$1"
}

fail() {
  printf "${RED}FAIL${NC} %s\n" "$1"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Comando obrigatório não encontrado: $1"
    exit 1
  fi
}

RESULTS=()

record_result() {
  local name="$1"
  local status="$2"
  RESULTS+=("$status:$name")
}

run_phase() {
  local name="$1"
  shift

  if "$@"; then
    ok "$name"
    record_result "$name" "PASS"
    return 0
  fi

  fail "$name"
  record_result "$name" "FAIL"
  return 1
}

run_frontend_checks() {
  step "Frontend: lint"
  run_phase "Frontend lint" bash -lc "cd '$FRONTEND_DIR' && npm run lint"

  step "Frontend: build"
  run_phase "Frontend build" bash -lc "cd '$FRONTEND_DIR' && npm run build"
}

run_backend_checks() {
  step "Backend: typecheck"
  run_phase "Backend typecheck" bash -lc "cd '$BACKEND_DIR' && node ./node_modules/typescript/bin/tsc -p tsconfig.json"

  step "Backend: API smoke"
  if curl -fsS "${QC_API_URL:-http://localhost:8080}/api/tools" >/dev/null 2>&1; then
    run_phase "Backend API smoke" bash -lc "cd '$BACKEND_DIR' && npm run test:smoke"
  else
    warn "API indisponível em ${QC_API_URL:-http://localhost:8080}; pulando backend API smoke"
    record_result "Backend API smoke" "SKIP"
  fi
}

run_security_checks() {
  step "Security: API hardening smoke"
  if curl -fsS "${QC_API_URL:-http://localhost:8080}/api/tools" >/dev/null 2>&1; then
    run_phase "Security API smoke" bash -lc "cd '$BACKEND_DIR' && npm run test:security"
  else
    warn "API indisponível em ${QC_API_URL:-http://localhost:8080}; pulando security API smoke"
    record_result "Security API smoke" "SKIP"
  fi

  step "Security: auditoria de dependências (backend)"
  if [[ -f "$BACKEND_DIR/package-lock.json" ]]; then
    run_phase "Security audit backend" bash -lc "cd '$BACKEND_DIR' && npm audit --omit=dev --audit-level=high"
  else
    warn "package-lock.json ausente no backend; pulando npm audit"
    record_result "Security audit backend" "SKIP"
  fi

  step "Security: auditoria de dependências (frontend)"
  if [[ -f "$FRONTEND_DIR/package-lock.json" ]]; then
    run_phase "Security audit frontend" bash -lc "cd '$FRONTEND_DIR' && npm audit --omit=dev --audit-level=high"
  else
    warn "package-lock.json ausente no frontend; pulando npm audit"
    record_result "Security audit frontend" "SKIP"
  fi
}

check_docker_services() {
  step "Docker: checando containers e conectividade"
  if ! command -v docker >/dev/null 2>&1; then
    warn "Docker não encontrado, pulando smoke test de infraestrutura"
    record_result "Docker smoke" "SKIP"
    return
  fi

  local backend_running mysql_running
  backend_running="$(docker ps --filter "name=^toolora-backend$" --format '{{.Names}}')"
  mysql_running="$(docker ps --filter "name=^toolora-mysql$" --format '{{.Names}}')"

  if [[ -z "$backend_running" || -z "$mysql_running" ]]; then
    warn "Containers toolora-backend/toolora-mysql não estão ativos, pulando smoke test"
    record_result "Docker smoke" "SKIP"
    return
  fi

  if docker exec toolora-mysql mysqladmin ping -h localhost -uroot -pMine2026 >/dev/null && \
     curl -fsS http://localhost:8080/api/tools >/dev/null; then
    ok "MySQL e API pública estão respondendo"
    record_result "Docker smoke" "PASS"
  else
    fail "Falha no smoke test de MySQL/API pública"
    record_result "Docker smoke" "FAIL"
  fi

  if [[ -n "${QC_ADMIN_EMAIL:-}" && -n "${QC_ADMIN_PASSWORD:-}" ]]; then
    step "API autenticada: login e rota admin"
    local response token
    response="$(curl -fsS -X POST http://localhost:8080/api/auth/login \
      -H 'Content-Type: application/json' \
      -d "{\"email\":\"${QC_ADMIN_EMAIL}\",\"password\":\"${QC_ADMIN_PASSWORD}\"}")"

    token="$(node -e "const r=JSON.parse(process.argv[1]); process.stdout.write(r.token||'')" "$response")"

    if [[ -z "$token" ]]; then
      fail "Login retornou sem token"
      record_result "API autenticada" "FAIL"
    elif curl -fsS http://localhost:8080/api/admin/users -H "Authorization: Bearer $token" >/dev/null; then
      ok "Rotas autenticadas de admin respondendo"
      record_result "API autenticada" "PASS"
    else
      fail "Falha ao acessar rota admin autenticada"
      record_result "API autenticada" "FAIL"
    fi
  else
    warn "Defina QC_ADMIN_EMAIL e QC_ADMIN_PASSWORD para testar login/rotas autenticadas"
    record_result "API autenticada" "SKIP"
  fi
}

print_summary() {
  local failed=0

  printf "\n${BLUE}==>${NC} Resumo do quality-check\n"
  for item in "${RESULTS[@]}"; do
    local status="${item%%:*}"
    local name="${item#*:}"

    case "$status" in
      PASS)
        printf "  ${GREEN}PASS${NC} %s\n" "$name"
        ;;
      FAIL)
        printf "  ${RED}FAIL${NC} %s\n" "$name"
        failed=$((failed + 1))
        ;;
      SKIP)
        printf "  ${YELLOW}SKIP${NC} %s\n" "$name"
        ;;
    esac
  done

  if (( failed > 0 )); then
    printf "\n${RED}Resultado final:${NC} %d etapa(s) com falha.\n" "$failed"
    return 1
  fi

  printf "\n${GREEN}Resultado final:${NC} qualidade validada sem falhas.\n"
  return 0
}

main() {
  require_cmd npm
  require_cmd node
  require_cmd curl

  step "Iniciando quality-check do Toolora"

  run_frontend_checks
  run_backend_checks
  run_security_checks
  check_docker_services

  print_summary
}

main "$@"
