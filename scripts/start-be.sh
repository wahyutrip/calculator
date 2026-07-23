#!/bin/bash
# Start the NestJS API alone, in the foreground. http://localhost:<BE_PORT>
# Starts Postgres first when it isn't already up.
#
# Phase 2 only — the MVP calculator does not call this service.
#
# Usage: ./scripts/start-be.sh [--no-infra]
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

NO_INFRA=false
for arg in "$@"; do
  case "$arg" in
    --no-infra) NO_INFRA=true ;;
    -h|--help)
      cat <<'USAGE'
start-be.sh — start the NestJS API in the foreground.
  ./scripts/start-be.sh             start Postgres if needed, then the API
  ./scripts/start-be.sh --no-infra  assume Postgres is already reachable
USAGE
      exit 0 ;;
    *) print_error "Unknown flag: $arg (supported: --no-infra, --help)"; exit 1 ;;
  esac
done

load_ports
free_port "$BE_PORT" "backend"
if [ "$NO_INFRA" = false ]; then
  ensure_infra
  sync_backend_infra_ports
fi

print_info "Starting API on :$BE_PORT (foreground — Ctrl+C to stop)..."
cd "$ROOT/apps/be" && pnpm run dev
