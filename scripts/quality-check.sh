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

api_base_url() {
  printf '%s' "${QC_API_URL:-http://localhost:8080}"
}

json_get() {
  node -e "const value = JSON.parse(process.argv[1]); const path = process.argv[2].split('.'); let current = value; for (const part of path) { current = current?.[part]; } if (current === undefined || current === null) process.exit(0); process.stdout.write(String(current));" "$1" "$2"
}

curl_status() {
  local method="$1"
  local url="$2"
  local auth_header="${3:-}"
  local body="${4:-}"

  if [[ -n "$body" ]]; then
    if [[ -n "$auth_header" ]]; then
      curl -sS -o /dev/null -w '%{http_code}' -X "$method" "$url" \
        -H 'Content-Type: application/json' \
        -H "$auth_header" \
        -d "$body"
    else
      curl -sS -o /dev/null -w '%{http_code}' -X "$method" "$url" \
        -H 'Content-Type: application/json' \
        -d "$body"
    fi
  else
    if [[ -n "$auth_header" ]]; then
      curl -sS -o /dev/null -w '%{http_code}' -X "$method" "$url" \
        -H "$auth_header"
    else
      curl -sS -o /dev/null -w '%{http_code}' -X "$method" "$url"
    fi
  fi
}

login_and_get_token() {
  local email="$1"
  local password="$2"
  local url
  url="$(api_base_url)/api/auth/login"

  local response
  response="$(curl -sS -X POST "$url" -H 'Content-Type: application/json' -d "{\"email\":\"${email}\",\"password\":\"${password}\"}")"
  json_get "$response" "token"
}

login_and_get_user_id() {
  local token="$1"
  local url
  url="$(api_base_url)/api/auth/me"

  local response
  response="$(curl -sS "$url" -H "Authorization: Bearer $token")"
  json_get "$response" "user.id"
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
    step "Backend: E2E user flow"
    if curl -fsS "${QC_API_URL:-http://localhost:8080}/api/tools" >/dev/null 2>&1; then
      run_phase "Backend E2E user flow" bash -lc "cd '$BACKEND_DIR' && node ./scripts/e2e-user-flow.js"
    else
      warn "API indisponível; pulando E2E user flow"
      record_result "Backend E2E user flow" "SKIP"
    fi
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

run_route_security_matrix() {
  step "Security: matriz de rotas"

  local base_url api_url anonymous_status auth_me_status auth_users_status management_users_status management_posts_status
  local admin_token="" admin_id="" user_token="" user_id=""
  base_url="$(api_base_url)"
  api_url="$base_url/api"

  if ! curl -fsS "$api_url/tools" >/dev/null 2>&1; then
    warn "API indisponível em $base_url; pulando matriz de rotas"
    record_result "Route security matrix" "SKIP"
    return 0
  fi

  local public_tools_status user_tools_mine_status user_tools_interactions_status user_tools_favorites_status
  local user_tools_pending_status user_tools_reviewed_status user_tools_create_status

  public_tools_status="$(curl_status GET "$api_url/tools")"
  if [[ "$public_tools_status" == "200" ]]; then
    ok "tools público responde sem autenticação"
    record_result "Route security: tools public" "PASS"
  else
    fail "tools público falhou sem autenticação (HTTP $public_tools_status)"
    record_result "Route security: tools public" "FAIL"
  fi

  anonymous_status="$(curl_status GET "$api_url/auth/me")"
  if [[ "$anonymous_status" == "401" || "$anonymous_status" == "403" ]]; then
    ok "auth/me rejeita acesso anônimo"
    record_result "Route security: auth/me anonymous" "PASS"
  else
    fail "auth/me não rejeitou acesso anônimo (HTTP $anonymous_status)"
    record_result "Route security: auth/me anonymous" "FAIL"
  fi

  auth_users_status="$(curl_status GET "$api_url/auth/users")"
  if [[ "$auth_users_status" == "401" || "$auth_users_status" == "403" ]]; then
    ok "auth/users exige autenticação de admin"
    record_result "Route security: auth/users anonymous" "PASS"
  else
    fail "auth/users exposta sem autenticação (HTTP $auth_users_status)"
    record_result "Route security: auth/users anonymous" "FAIL"
  fi

  management_users_status="$(curl_status GET "$api_url/management/users")"
  if [[ "$management_users_status" == "401" || "$management_users_status" == "403" ]]; then
    ok "management/users rejeita acesso anônimo"
    record_result "Route security: management/users anonymous" "PASS"
  else
    fail "management/users exposta sem autenticação (HTTP $management_users_status)"
    record_result "Route security: management/users anonymous" "FAIL"
  fi

  management_posts_status="$(curl_status POST "$api_url/management/posts/1/block")"
  if [[ "$management_posts_status" == "401" || "$management_posts_status" == "403" ]]; then
    ok "management/posts/:id/block rejeita acesso anônimo"
    record_result "Route security: block anonymous" "PASS"
  else
    fail "management/posts/:id/block exposta sem autenticação (HTTP $management_posts_status)"
    record_result "Route security: block anonymous" "FAIL"
  fi

  user_tools_mine_status="$(curl_status GET "$api_url/tools/mine")"
  if [[ "$user_tools_mine_status" == "401" || "$user_tools_mine_status" == "403" ]]; then
    ok "tools/mine rejeita acesso anônimo"
    record_result "Route security: tools/mine anonymous" "PASS"
  else
    fail "tools/mine exposta sem autenticação (HTTP $user_tools_mine_status)"
    record_result "Route security: tools/mine anonymous" "FAIL"
  fi

  user_tools_interactions_status="$(curl_status GET "$api_url/tools/interactions")"
  if [[ "$user_tools_interactions_status" == "401" || "$user_tools_interactions_status" == "403" ]]; then
    ok "tools/interactions rejeita acesso anônimo"
    record_result "Route security: tools/interactions anonymous" "PASS"
  else
    fail "tools/interactions exposta sem autenticação (HTTP $user_tools_interactions_status)"
    record_result "Route security: tools/interactions anonymous" "FAIL"
  fi

  user_tools_favorites_status="$(curl_status GET "$api_url/tools/favorites")"
  if [[ "$user_tools_favorites_status" == "401" || "$user_tools_favorites_status" == "403" ]]; then
    ok "tools/favorites rejeita acesso anônimo"
    record_result "Route security: tools/favorites anonymous" "PASS"
  else
    fail "tools/favorites exposta sem autenticação (HTTP $user_tools_favorites_status)"
    record_result "Route security: tools/favorites anonymous" "FAIL"
  fi

  user_tools_pending_status="$(curl_status GET "$api_url/tools/pending")"
  if [[ "$user_tools_pending_status" == "401" || "$user_tools_pending_status" == "403" ]]; then
    ok "tools/pending rejeita acesso anônimo"
    record_result "Route security: tools/pending anonymous" "PASS"
  else
    fail "tools/pending exposta sem autenticação (HTTP $user_tools_pending_status)"
    record_result "Route security: tools/pending anonymous" "FAIL"
  fi

  user_tools_reviewed_status="$(curl_status GET "$api_url/tools/reviewed")"
  if [[ "$user_tools_reviewed_status" == "401" || "$user_tools_reviewed_status" == "403" ]]; then
    ok "tools/reviewed rejeita acesso anônimo"
    record_result "Route security: tools/reviewed anonymous" "PASS"
  else
    fail "tools/reviewed exposta sem autenticação (HTTP $user_tools_reviewed_status)"
    record_result "Route security: tools/reviewed anonymous" "FAIL"
  fi

  user_tools_create_status="$(curl_status POST "$api_url/tools" "" '{}')"
  if [[ "$user_tools_create_status" == "401" || "$user_tools_create_status" == "403" ]]; then
    ok "tools POST rejeita criação anônima"
    record_result "Route security: tools create anonymous" "PASS"
  else
    fail "tools POST permitiu criação anônima (HTTP $user_tools_create_status)"
    record_result "Route security: tools create anonymous" "FAIL"
  fi

  if [[ -n "${QC_ADMIN_EMAIL:-}" && -n "${QC_ADMIN_PASSWORD:-}" ]]; then
    local admin_token admin_id
    admin_token="$(login_and_get_token "$QC_ADMIN_EMAIL" "$QC_ADMIN_PASSWORD")"
    admin_id="$(login_and_get_user_id "$admin_token")"

    if [[ -z "$admin_token" || -z "$admin_id" ]]; then
      fail "Falha ao obter token/id do admin para matriz de rotas"
      record_result "Route security: admin token" "FAIL"
    else
      local admin_me_status admin_users_admin_status auth_users_admin_status
      admin_me_status="$(curl_status GET "$api_url/auth/me" "Authorization: Bearer $admin_token")"
      if [[ "$admin_me_status" == "200" ]]; then
        ok "auth/me responde para admin autenticado"
        record_result "Route security: auth/me admin" "PASS"
      else
        fail "auth/me falhou para admin autenticado (HTTP $admin_me_status)"
        record_result "Route security: auth/me admin" "FAIL"
      fi

      auth_users_admin_status="$(curl_status GET "$api_url/auth/users" "Authorization: Bearer $admin_token")"
      if [[ "$auth_users_admin_status" == "200" ]]; then
        ok "auth/users permite admin"
        record_result "Route security: auth/users admin" "PASS"
      else
        fail "auth/users não permitiu admin (HTTP $auth_users_admin_status)"
        record_result "Route security: auth/users admin" "FAIL"
      fi

      admin_users_admin_status="$(curl_status GET "$api_url/management/users" "Authorization: Bearer $admin_token")"
      if [[ "$admin_users_admin_status" == "200" ]]; then
        ok "management/users permite admin"
        record_result "Route security: management/users admin" "PASS"
      else
        fail "management/users não permitiu admin (HTTP $admin_users_admin_status)"
        record_result "Route security: management/users admin" "FAIL"
      fi
    fi
  else
    warn "Defina QC_ADMIN_EMAIL e QC_ADMIN_PASSWORD para validar rotas administrativas autenticadas"
    record_result "Route security: admin authenticated" "SKIP"
  fi

  if [[ -n "${QC_USER_EMAIL:-}" && -n "${QC_USER_PASSWORD:-}" ]]; then
    local user_token user_id block_status list_users_status user_me_status
    user_token="$(login_and_get_token "$QC_USER_EMAIL" "$QC_USER_PASSWORD")"
    user_id="$(login_and_get_user_id "$user_token")"

    if [[ -z "$user_token" || -z "$user_id" ]]; then
      fail "Falha ao obter token/id do usuário para teste de IDOR"
      record_result "Route security: user token" "FAIL"
    else
      user_me_status="$(curl_status GET "$api_url/auth/me" "Authorization: Bearer $user_token")"
      if [[ "$user_me_status" == "200" ]]; then
        ok "auth/me responde para usuário autenticado"
        record_result "Route security: auth/me user" "PASS"
      else
        fail "auth/me falhou para usuário autenticado (HTTP $user_me_status)"
        record_result "Route security: auth/me user" "FAIL"
      fi

      list_users_status="$(curl_status GET "$api_url/management/users" "Authorization: Bearer $user_token")"
      if [[ "$list_users_status" == "401" || "$list_users_status" == "403" ]]; then
        ok "management/users bloqueia usuário comum"
        record_result "Route security: management/users user" "PASS"
      else
        fail "management/users aceitou usuário comum (HTTP $list_users_status)"
        record_result "Route security: management/users user" "FAIL"
      fi

      user_tools_mine_status="$(curl_status GET "$api_url/tools/mine" "Authorization: Bearer $user_token")"
      if [[ "$user_tools_mine_status" == "200" ]]; then
        ok "tools/mine permite usuário autenticado"
        record_result "Route security: tools/mine user" "PASS"
      else
        fail "tools/mine não permitiu usuário autenticado (HTTP $user_tools_mine_status)"
        record_result "Route security: tools/mine user" "FAIL"
      fi

      user_tools_interactions_status="$(curl_status GET "$api_url/tools/interactions" "Authorization: Bearer $user_token")"
      if [[ "$user_tools_interactions_status" == "200" ]]; then
        ok "tools/interactions permite usuário autenticado"
        record_result "Route security: tools/interactions user" "PASS"
      else
        fail "tools/interactions não permitiu usuário autenticado (HTTP $user_tools_interactions_status)"
        record_result "Route security: tools/interactions user" "FAIL"
      fi

      user_tools_favorites_status="$(curl_status GET "$api_url/tools/favorites" "Authorization: Bearer $user_token")"
      if [[ "$user_tools_favorites_status" == "200" ]]; then
        ok "tools/favorites permite usuário autenticado"
        record_result "Route security: tools/favorites user" "PASS"
      else
        fail "tools/favorites não permitiu usuário autenticado (HTTP $user_tools_favorites_status)"
        record_result "Route security: tools/favorites user" "FAIL"
      fi

      user_tools_pending_status="$(curl_status GET "$api_url/tools/pending" "Authorization: Bearer $user_token")"
      if [[ "$user_tools_pending_status" == "401" || "$user_tools_pending_status" == "403" ]]; then
        ok "tools/pending bloqueia usuário comum"
        record_result "Route security: tools/pending user" "PASS"
      else
        fail "tools/pending aceitou usuário comum (HTTP $user_tools_pending_status)"
        record_result "Route security: tools/pending user" "FAIL"
      fi

      user_tools_reviewed_status="$(curl_status GET "$api_url/tools/reviewed" "Authorization: Bearer $user_token")"
      if [[ "$user_tools_reviewed_status" == "401" || "$user_tools_reviewed_status" == "403" ]]; then
        ok "tools/reviewed bloqueia usuário comum"
        record_result "Route security: tools/reviewed user" "PASS"
      else
        fail "tools/reviewed aceitou usuário comum (HTTP $user_tools_reviewed_status)"
        record_result "Route security: tools/reviewed user" "FAIL"
      fi

      if [[ -n "${QC_ADMIN_EMAIL:-}" && -n "${QC_ADMIN_PASSWORD:-}" && -n "${admin_id:-}" && "$admin_id" != "$user_id" ]]; then
        block_status="$(curl_status POST "$api_url/management/posts/1/block" "Authorization: Bearer $user_token")"
        if [[ "$block_status" == "401" || "$block_status" == "403" ]]; then
          ok "management/posts/:id/block bloqueia usuário comum"
          record_result "Route security: block user" "PASS"
        else
          fail "management/posts/:id/block permitiu usuário comum (HTTP $block_status)"
          record_result "Route security: block user" "FAIL"
        fi

        local idor_status
        idor_status="$(curl_status PUT "$api_url/auth/user/$admin_id" "Authorization: Bearer $user_token" '{"name":"IDOR TEST","email":"idor@example.com"}')"
        if [[ "$idor_status" == "401" || "$idor_status" == "403" ]]; then
          ok "IDOR: usuário não pode editar outro usuário"
          record_result "Route security: IDOR update user" "PASS"
        else
          fail "IDOR possível em auth/user/:id (HTTP $idor_status)"
          record_result "Route security: IDOR update user" "FAIL"
        fi
      else
        warn "Sem um segundo usuário/admin distinto, pulando verificação de IDOR por userId"
        record_result "Route security: IDOR update user" "SKIP"
      fi

      user_tools_create_status="$(curl_status POST "$api_url/tools" "Authorization: Bearer $user_token" '{}')"
      if [[ "$user_tools_create_status" == "400" || "$user_tools_create_status" == "422" ]]; then
        ok "tools POST exige payload válido para usuário autenticado"
        record_result "Route security: tools create user" "PASS"
      elif [[ "$user_tools_create_status" == "401" || "$user_tools_create_status" == "403" ]]; then
        fail "tools POST rejeitou usuário autenticado (HTTP $user_tools_create_status)"
        record_result "Route security: tools create user" "FAIL"
      else
        warn "tools POST retornou HTTP $user_tools_create_status para usuário autenticado"
        record_result "Route security: tools create user" "SKIP"
      fi
    fi
  else
    warn "Defina QC_USER_EMAIL e QC_USER_PASSWORD para validar bloqueio de usuário comum e IDOR"
    record_result "Route security: user authenticated" "SKIP"
  fi

  if [[ -n "${QC_MODERATOR_EMAIL:-}" && -n "${QC_MODERATOR_PASSWORD:-}" ]]; then
    local moderator_token moderator_pending_status moderator_reviewed_status moderator_approve_status moderator_reject_status
    moderator_token="$(login_and_get_token "$QC_MODERATOR_EMAIL" "$QC_MODERATOR_PASSWORD")"

    if [[ -z "$moderator_token" ]]; then
      fail "Falha ao obter token do moderador para matriz de rotas"
      record_result "Route security: moderator token" "FAIL"
    else
      moderator_pending_status="$(curl_status GET "$api_url/tools/pending" "Authorization: Bearer $moderator_token")"
      if [[ "$moderator_pending_status" == "200" ]]; then
        ok "tools/pending permite moderador"
        record_result "Route security: tools/pending moderator" "PASS"
      else
        fail "tools/pending não permitiu moderador (HTTP $moderator_pending_status)"
        record_result "Route security: tools/pending moderator" "FAIL"
      fi

      moderator_reviewed_status="$(curl_status GET "$api_url/tools/reviewed" "Authorization: Bearer $moderator_token")"
      if [[ "$moderator_reviewed_status" == "200" ]]; then
        ok "tools/reviewed permite moderador"
        record_result "Route security: tools/reviewed moderator" "PASS"
      else
        fail "tools/reviewed não permitiu moderador (HTTP $moderator_reviewed_status)"
        record_result "Route security: tools/reviewed moderator" "FAIL"
      fi

      moderator_approve_status="$(curl_status PATCH "$api_url/tools/000000000000000000000000/approve" "Authorization: Bearer $moderator_token" '{}')"
      if [[ "$moderator_approve_status" == "400" || "$moderator_approve_status" == "404" || "$moderator_approve_status" == "422" ]]; then
        ok "approve/reject passam pelo middleware de moderador"
        record_result "Route security: tools approve moderator" "PASS"
      elif [[ "$moderator_approve_status" == "401" || "$moderator_approve_status" == "403" ]]; then
        fail "approve/reject bloqueou moderador (HTTP $moderator_approve_status)"
        record_result "Route security: tools approve moderator" "FAIL"
      else
        warn "approve/reject retornou HTTP $moderator_approve_status para moderador"
        record_result "Route security: tools approve moderator" "SKIP"
      fi

      moderator_reject_status="$(curl_status PATCH "$api_url/tools/000000000000000000000000/reject" "Authorization: Bearer $moderator_token" '{}')"
      if [[ "$moderator_reject_status" == "400" || "$moderator_reject_status" == "404" || "$moderator_reject_status" == "422" ]]; then
        ok "reject passa pelo middleware de moderador"
        record_result "Route security: tools reject moderator" "PASS"
      elif [[ "$moderator_reject_status" == "401" || "$moderator_reject_status" == "403" ]]; then
        fail "reject bloqueou moderador (HTTP $moderator_reject_status)"
        record_result "Route security: tools reject moderator" "FAIL"
      else
        warn "reject retornou HTTP $moderator_reject_status para moderador"
        record_result "Route security: tools reject moderator" "SKIP"
      fi
    fi
  else
    warn "Defina QC_MODERATOR_EMAIL e QC_MODERATOR_PASSWORD para validar rotas de moderação"
    record_result "Route security: moderator authenticated" "SKIP"
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
    elif curl -fsS http://localhost:8080/api/management/users -H "Authorization: Bearer $token" >/dev/null; then
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
  run_route_security_matrix
  check_docker_services

  print_summary
}

main "$@"