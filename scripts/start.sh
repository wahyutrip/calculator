#!/bin/bash
# Start the money-management dev stack. Web runs in the background with a PID
# file and a log under logs/; the script then streams the log in the foreground,
# so Ctrl+C stops everything it started.
#
# The MVP is web-only: the calculator computes locally and persists to
# localStorage, so no database and no API are required. --with-be adds the
# Phase 2 backend (and starts Postgres for it).
#
# Usage: ./scripts/start.sh [--with-be] [--local] [--https] [IP]
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

WITH_BE=false
LAN=true
HTTPS=false
LAN_IP_ARG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --with-be) WITH_BE=true ;;
    --local|--no-lan) LAN=false ;;
    --https) HTTPS=true ;;
    -h|--help)
      cat <<'USAGE'
start.sh — start the dev stack (run this day-to-day).

  ./scripts/start.sh                 web only (what the MVP needs)
  ./scripts/start.sh --with-be       web + NestJS API + Postgres
  ./scripts/start.sh --https         serve over TLS — required to test the PWA
                                     on a phone (service workers need a secure
                                     origin; http://<lan-ip> is not one)
  ./scripts/start.sh --local         localhost only, no LAN exposure
  ./scripts/start.sh 192.168.1.5     force the advertised LAN IP

Ctrl+C stops what this script started. First-time setup is ./scripts/setup.sh.
USAGE
      exit 0 ;;
    *)
      if [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then LAN_IP_ARG="$1";
      else print_error "Unknown flag: $1 (supported: --with-be, --local, --https, [IP], --help)"; exit 1; fi
      ;;
  esac
  shift
done

echo -e "${GREEN}══ money-management dev stack ══${NC}"
load_ports

# Clean any prior instance FIRST (stale PID files + orphaned watchers), then free
# the ports. Killing only the port listener leaves the PID file pointing at a live
# orphan, so start_bg wrongly reports "already running" and the health check hangs.
stop_pid web "next dev|next-server" >/dev/null 2>&1 || true
stop_pid be  "nest start --watch|apps/be/dist/main" >/dev/null 2>&1 || true
free_port "$WEB_PORT" "web"

WEB_CMD=(pnpm run dev)
SCHEME="http"
if [ "$HTTPS" = true ]; then
  # `next dev --experimental-https` mints a locally-trusted cert on first run.
  WEB_CMD=(pnpm run dev:https)
  SCHEME="https"
fi

if [ "$WITH_BE" = true ]; then
  free_port "$BE_PORT" "backend"
  ensure_infra
  start_bg be "$ROOT/apps/be" pnpm run dev
fi

start_bg web "$ROOT/apps/web" "${WEB_CMD[@]}"

print_info "Waiting for services..."
if [ "$WITH_BE" = true ]; then
  wait_for_http "http://localhost:$BE_PORT/health" 120 "Backend API" || true
fi
wait_for_http "$SCHEME://localhost:$WEB_PORT" 120 "Web app" || true

echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  • Web app:  ${GREEN}$SCHEME://localhost:$WEB_PORT${NC}"
[ "$WITH_BE" = true ] && echo -e "  • API:      ${GREEN}http://localhost:$BE_PORT${NC} (health: /health)"
[ "$WITH_BE" = true ] && echo -e "  • Adminer:  ${GREEN}http://localhost:$(env_file_value_or "$ROOT/infra/.env" ADMINER_PORT 8081)${NC}"
echo -e "  • Logs:     ${GREEN}logs/web.log${NC}$([ "$WITH_BE" = true ] && echo " · logs/be.log")"
echo ""
[ "$LAN" = true ] && print_web_lan_help "$LAN_IP_ARG" "$SCHEME"
echo ""

# Stream the logs in the foreground. Ctrl+C stops the services this script
# started; Docker infra keeps running (use ./scripts/stop.sh --infra for that).
cleanup() {
  echo ""
  print_info "Stopping services..."
  stop_pid web "next dev|next-server"
  [ "$WITH_BE" = true ] && stop_pid be "nest start --watch|apps/be/dist/main"
  exit 0
}
trap cleanup INT TERM

print_info "Streaming logs — Ctrl+C to stop."
if [ "$WITH_BE" = true ]; then
  tail -f "$LOG_DIR/web.log" "$LOG_DIR/be.log"
else
  tail -f "$LOG_DIR/web.log"
fi
