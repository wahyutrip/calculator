#!/bin/bash
# Start the web app alone, in the foreground. http://localhost:<WEB_PORT>
#
# `next dev` binds 0.0.0.0 by default, so the app is already reachable from a
# phone on the same Wi-Fi. But service workers only register on a SECURE origin
# — http://localhost counts, http://192.168.x.x does NOT — so testing the PWA
# (install prompt, offline, precache) on a real device requires --https.
#
# Usage: ./scripts/start-web.sh [--https] [--local] [IP]
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

LAN=true
HTTPS=false
LAN_IP_ARG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --https) HTTPS=true ;;
    --local|--no-lan) LAN=false ;;
    -h|--help)
      cat <<'USAGE'
start-web.sh — start the web app in the foreground.

  ./scripts/start-web.sh              localhost + LAN over plain HTTP
  ./scripts/start-web.sh --https      TLS — REQUIRED to test the PWA on a phone
  ./scripts/start-web.sh --local      localhost only
  ./scripts/start-web.sh 192.168.1.5  force the advertised LAN IP

The MVP calculator has no backend dependency — this is all you need to run it.
USAGE
      exit 0 ;;
    *)
      if [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then LAN_IP_ARG="$1";
      else print_error "Unknown flag: $1 (supported: --https, --local, [IP], --help)"; exit 1; fi
      ;;
  esac
  shift
done

load_ports
free_port "$WEB_PORT" "web"

SCHEME="http"
SCRIPT="dev"
if [ "$HTTPS" = true ]; then
  SCHEME="https"
  SCRIPT="dev:https"
  print_info "Serving over TLS (next dev --experimental-https). The first run mints a"
  print_info "locally-trusted certificate; accept the warning once on the phone."
fi

[ "$LAN" = true ] && print_web_lan_help "$LAN_IP_ARG" "$SCHEME"

print_info "Starting web on :$WEB_PORT (foreground — Ctrl+C to stop)..."
cd "$ROOT/apps/web" && pnpm run "$SCRIPT"
