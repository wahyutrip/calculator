#!/bin/bash
# Local infrastructure — PostgreSQL + Adminer. Phase 2 only; the MVP calculator
# needs none of it.
#
# Usage: ./scripts/infra.sh [start|stop|down|status]
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

require_cmd docker "Install Docker (https://docs.docker.com/get-docker/)"

# Run compose from infra/ so relative paths, container names and the auto-loaded
# infra/.env all resolve exactly as the compose file expects.
cd "$ROOT/infra"
ensure_env_file "$ROOT/infra/.env" "$ROOT/infra/.env.example" "infra" || true

cmd="${1:-start}"
case "$cmd" in
  start)
    print_info "Starting infrastructure (PostgreSQL, Adminer)..."
    docker compose up -d
    wait_for_container_healthy mm-postgres 60 "PostgreSQL"
    print_success "Infrastructure up"
    echo -e "  Postgres : localhost:$(env_file_value_or "$ROOT/infra/.env" POSTGRES_PORT 5433)"
    echo -e "  Adminer  : http://localhost:$(env_file_value_or "$ROOT/infra/.env" ADMINER_PORT 8081)"
    ;;
  stop)
    print_info "Stopping infrastructure (data preserved)..."
    docker compose down
    print_success "Infrastructure stopped"
    ;;
  down)
    print_warning "Removing infrastructure INCLUDING volumes — the database will be WIPED."
    docker compose down -v
    print_success "Infrastructure removed"
    ;;
  status)
    docker compose ps
    ;;
  -h|--help|help)
    cat <<'USAGE'
infra.sh — control the local Docker services (Postgres + Adminer).
setup.sh --with-be and start.sh --with-be call this for you.

  ./scripts/infra.sh [start]   start + wait for Postgres healthy (default)
  ./scripts/infra.sh status    container status
  ./scripts/infra.sh stop      stop containers, PRESERVE data
  ./scripts/infra.sh down      stop AND remove volumes (WIPES the database)
USAGE
    ;;
  *)
    print_error "Usage: ./scripts/infra.sh [start|stop|down|status] (see --help)"
    exit 1
    ;;
esac
