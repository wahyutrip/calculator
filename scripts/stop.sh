#!/bin/bash
# Stop the dev services started by start.sh. Docker infra is left running unless
# --infra is passed.
#
# Usage: ./scripts/stop.sh [--infra]
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

STOP_INFRA=false
for arg in "$@"; do
  case "$arg" in
    --infra) STOP_INFRA=true ;;
    -h|--help)
      cat <<'USAGE'
stop.sh — stop the dev services.
  ./scripts/stop.sh           stop web + API (Docker services keep running)
  ./scripts/stop.sh --infra   also stop the Docker services (data preserved)
USAGE
      exit 0 ;;
    *) print_error "Unknown flag: $arg (supported: --infra, --help)"; exit 1 ;;
  esac
done

load_ports
stop_pid web "next dev|next-server"
stop_pid be  "nest start --watch|apps/be/dist/main"
free_port "$WEB_PORT" "web"
free_port "$BE_PORT" "backend"

if [ "$STOP_INFRA" = true ]; then
  "$ROOT/scripts/infra.sh" stop
fi

print_success "Stopped."
