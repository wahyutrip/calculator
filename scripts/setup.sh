#!/bin/bash
# money-management one-shot dev setup: prerequisites → env files → install all
# workspaces → build the shared packages → (optionally) start Postgres and run
# the backend migrations.
#
# Run this ONCE per checkout. Day-to-day use ./scripts/start.sh.
#
# Usage: ./scripts/setup.sh [--with-be] [--skip-infra]
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

WITH_BE=false
SKIP_INFRA=false
for arg in "$@"; do
  case "$arg" in
    --with-be) WITH_BE=true ;;
    --skip-infra) SKIP_INFRA=true ;;
    -h|--help)
      cat <<'USAGE'
setup.sh — one-time project bootstrap (run ONCE per checkout).
Checks prerequisites, creates env files from the examples, installs every
workspace with pnpm, and builds the shared packages so the apps can resolve them.

  ./scripts/setup.sh              web-only setup (what the MVP needs)
  ./scripts/setup.sh --with-be    also start Postgres and run backend migrations
  ./scripts/setup.sh --skip-infra never touch Docker (implies no migrations)

The MVP calculator stores everything in the browser's localStorage and talks to
no backend, so the default path needs neither Docker nor Postgres. Pass
--with-be when you are working on the Phase 2 API.

After setup, use ./scripts/start.sh day-to-day.
USAGE
      exit 0 ;;
    *) print_error "Unknown flag: $arg (supported: --with-be, --skip-infra, --help)"; exit 1 ;;
  esac
done

echo -e "${GREEN}══ money-management dev setup ══${NC}"

# 1 — prerequisites
print_info "Checking prerequisites..."
require_cmd node "Install Node.js >= 20 (https://nodejs.org)"
require_cmd corepack "Ships with Node.js >= 16.9 — try: npm i -g corepack"
NODE_V="$(node -v | sed 's/^v//')"
version_gte "$NODE_V" "20.0.0" || { print_error "Node $NODE_V < 20.0.0 (see engines in package.json)"; exit 1; }
corepack enable >/dev/null 2>&1 || print_warning "corepack enable failed — pnpm may not be on PATH"
require_cmd pnpm "Run: corepack enable && corepack prepare pnpm@9.12.0 --activate"
print_success "node $NODE_V / pnpm $(pnpm -v)"
if [ "$WITH_BE" = true ] && [ "$SKIP_INFRA" = false ]; then
  require_cmd docker "Install Docker (https://docs.docker.com/get-docker/)"
  print_success "docker present"
fi

# 2 — env files
print_info "Ensuring env files..."
ensure_env_file "$ROOT/apps/web/.env.local" "$ROOT/apps/web/.env.local.example" "web" || true
ensure_env_file "$ROOT/apps/be/.env.local"  "$ROOT/apps/be/.env.local.example"  "backend" || true
ensure_env_file "$ROOT/infra/.env"          "$ROOT/infra/.env.example"          "infra" || true

# 3 — install the whole workspace in one pass (pnpm resolves apps/* + packages/*)
print_info "Installing workspace dependencies (pnpm install)..."
( cd "$ROOT" && pnpm install --frozen-lockfile 2>/dev/null || pnpm install )
print_success "Dependencies installed"

# 4 — build shared packages. apps/web imports @mm/calc, @mm/schemas and @mm/ui by
# their built `dist/`; without this first build, `next dev` fails to resolve them
# on a cold checkout.
print_info "Building shared packages (@mm/calc, @mm/schemas, @mm/ui)..."
( cd "$ROOT" && pnpm turbo run build --filter='./packages/*' )
print_success "Shared packages built"

# 5 — backend (opt-in; not needed for the MVP)
if [ "$WITH_BE" = true ]; then
  if [ "$SKIP_INFRA" = false ]; then
    ensure_infra
    sync_backend_infra_ports
  fi
  print_info "Generating Prisma client..."
  ( cd "$ROOT" && pnpm --filter @mm/be run prisma:generate )
  if [ "$SKIP_INFRA" = false ]; then
    print_info "Running database migrations..."
    if ! ( cd "$ROOT" && pnpm --filter @mm/be run prisma:deploy ); then
      print_error "Migrations failed. Check apps/be/.env.local DATABASE_URL against infra/.env POSTGRES_PORT."
      exit 1
    fi
    print_success "Database ready"
  fi
else
  print_info "Skipping backend (MVP is web-only). Re-run with --with-be when you need the API."
fi

echo ""
print_success "Setup complete."
echo -e "  Next: ${GREEN}./scripts/start.sh${NC}          web on http://localhost:${WEB_PORT:-3101}"
echo -e "        ${GREEN}./scripts/start.sh --with-be${NC} web + API + Postgres"
echo -e "        ${GREEN}./scripts/start-web.sh --https${NC} to test the PWA on your phone"
