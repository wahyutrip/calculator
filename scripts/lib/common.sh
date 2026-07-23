#!/bin/bash
# Shared helpers for the money-management dev scripts. Source from any script:
#   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#   source "$SCRIPT_DIR/lib/common.sh"
#
# Exposes: ROOT, LOG_DIR, print_* helpers, require_cmd, version_gte,
# ensure_env_file, load_ports, free_port, wait_for_http,
# wait_for_container_healthy, ensure_infra, start_bg / stop_pid, and the LAN /
# WSL2 helpers used to open the PWA on a real phone.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error()   { echo -e "${RED}✗${NC} $1"; }

# Project root = parent of scripts/lib
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

command_exists() { command -v "$1" >/dev/null 2>&1; }

require_cmd() {
  if ! command_exists "$1"; then
    print_error "$1 is not installed. $2"
    exit 1
  fi
}

# version_gte CURRENT REQUIRED — true when CURRENT >= REQUIRED (semver-ish).
version_gte() {
  [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

# ensure_env_file TARGET EXAMPLE LABEL — copy the example when target is missing.
ensure_env_file() {
  local target="$1" example="$2" label="$3"
  if [ -f "$target" ]; then
    print_success "$label env already present ($(basename "$target"))"
    return 0
  fi
  if [ ! -f "$example" ]; then
    print_warning "$label: no $(basename "$example") found — skipping"
    return 1
  fi
  cp "$example" "$target"
  print_success "$label env created from $(basename "$example") — review values before production use"
}

# env_file_value FILE KEY — last uncommented KEY= value, empty when absent.
env_file_value() {
  [ -f "$1" ] || return 0
  grep -E "^$2=" "$1" | tail -1 | cut -d= -f2- | tr -d '[:space:]' | tr -d '"'
}

# env_file_value_or FILE KEY DEFAULT — as above but substitutes DEFAULT when the
# key is missing or empty. env_file_value always exits 0, so `$(...) || echo X`
# never fires; this is the correct way to express a fallback.
env_file_value_or() {
  local v; v="$(env_file_value "$1" "$2")"
  printf '%s' "${v:-$3}"
}

# Dev ports. Each app's env file is the source of truth; a real exported env var
# (e.g. from CI) always wins over the file.
#   web     → apps/web/.env.local  WEB_PORT  (default 3101)
#   backend → apps/be/.env.local   PORT      (default 3100)
#
# 3100/3101 deliberately avoid 3000/3001, which sekar and swat already use — all
# three projects get developed on the same machine and must not fight for ports.
load_ports() {
  if [ -z "${BE_PORT:-}" ]; then
    BE_PORT="$(env_file_value "$ROOT/apps/be/.env.local" PORT)"
  fi
  export BE_PORT="${BE_PORT:-3100}"
  export PORT="$BE_PORT"

  if [ -z "${WEB_PORT:-}" ]; then
    WEB_PORT="$(env_file_value "$ROOT/apps/web/.env.local" WEB_PORT)"
  fi
  export WEB_PORT="${WEB_PORT:-3101}"
}

# free_port PORT [LABEL] — kill whatever is LISTENing on a TCP port so a fresh
# service can bind it. Only targets listeners, never client connections. No-op
# when the port is free or lsof/fuser are unavailable.
free_port() {
  local port="$1" label="${2:-port $1}" pids=""
  [ -n "$port" ] || return 0
  if command_exists lsof; then
    pids="$(lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  elif command_exists fuser; then
    pids="$(fuser "$port"/tcp 2>/dev/null | tr -s ' ' '\n' | grep -E '^[0-9]+$' || true)"
  fi
  if [ -n "$pids" ]; then
    print_warning "Freeing $label (:$port) — killing PID(s): $(echo "$pids" | tr '\n' ' ')"
    kill -9 $pids 2>/dev/null || true
    sleep 0.3
  fi
}

# set_env_key FILE KEY VALUE — set KEY=VALUE in an env file (replace or append).
set_env_key() {
  local file="$1" key="$2" val="$3"
  if grep -qE "^$key=" "$file"; then
    sed -i.bak "s|^$key=.*|$key=$val|" "$file" && rm -f "$file.bak"
  else
    printf '\n%s=%s\n' "$key" "$val" >> "$file"
  fi
}

# Keep the backend's DATABASE_URL port aligned with the infra host port.
# infra/.env may pin a non-default Postgres port (5433) to dodge a clash with
# sekar/swat on 5432; without this a fresh apps/be/.env.local silently targets
# the wrong database and boot fails with a confusing auth error.
sync_backend_infra_ports() {
  local infra_env="$ROOT/infra/.env" be_env="$ROOT/apps/be/.env.local"
  [ -f "$infra_env" ] && [ -f "$be_env" ] || return 0
  local pg_port cur_url
  pg_port="$(env_file_value "$infra_env" POSTGRES_PORT)"
  cur_url="$(env_file_value "$be_env" DATABASE_URL)"
  [ -n "$pg_port" ] && [ -n "$cur_url" ] || return 0
  if ! printf '%s' "$cur_url" | grep -q "localhost:$pg_port/"; then
    local synced
    synced="$(printf '%s' "$cur_url" | sed -E "s|localhost:[0-9]+/|localhost:$pg_port/|")"
    set_env_key "$be_env" DATABASE_URL "$synced"
    print_success "Synced apps/be/.env.local DATABASE_URL → port $pg_port (from infra/.env)"
  fi
}

# wait_for_container_healthy NAME TIMEOUT_S LABEL — poll a container's Docker
# healthcheck until "healthy" or timeout.
wait_for_container_healthy() {
  local name="$1" timeout="${2:-60}" label="${3:-$1}" waited=0
  until [ "$(docker inspect -f '{{.State.Health.Status}}' "$name" 2>/dev/null)" = "healthy" ]; do
    waited=$((waited + 3))
    if [ "$waited" -ge "$timeout" ]; then
      print_error "$label did not become healthy within ${timeout}s"
      return 1
    fi
    sleep 3
  done
  print_success "$label is healthy"
}

# Bring up Postgres + Adminer via scripts/infra.sh when not already running.
# Only needed by the backend — the MVP web app has no runtime dependencies.
ensure_infra() {
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^mm-postgres$'; then
    print_success "Infrastructure already running (mm-postgres up)"
  else
    "$ROOT/scripts/infra.sh" start
  fi
}

# wait_for_http URL TIMEOUT_S LABEL — poll until 2xx/3xx or timeout.
wait_for_http() {
  local url="$1" timeout="${2:-60}" label="${3:-$1}" waited=0
  until curl -sf -o /dev/null --max-time 2 "$url"; do
    waited=$((waited + 2))
    if [ "$waited" -ge "$timeout" ]; then
      print_error "$label did not respond within ${timeout}s ($url)"
      return 1
    fi
    sleep 2
  done
  print_success "$label is up ($url)"
}

# start_bg NAME DIR CMD... — start a background service with a PID file + log.
# setsid gives the service its own process group (PGID = PID) so stop_pid can
# kill the whole tree — `next dev` spawns child node processes that would
# otherwise survive as orphans still holding the port.
start_bg() {
  local name="$1" dir="$2"
  shift 2
  local pid_file="$LOG_DIR/$name.pid"
  if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    print_warning "$name already running (PID $(cat "$pid_file")) — skipping"
    return 0
  fi
  ( cd "$dir" && nohup setsid "$@" >"$LOG_DIR/$name.log" 2>&1 & echo $! >"$pid_file" )
  print_success "$name started (PID $(cat "$pid_file"), log: logs/$name.log)"
}

# stop_pid NAME [PATTERN] — kill the process group from the PID file, then sweep
# any orphan matching PATTERN (a stale watcher that outlived its parent).
stop_pid() {
  local name="$1" pattern="${2:-}" pid_file="$LOG_DIR/$name.pid"
  if [ -f "$pid_file" ]; then
    local pid; pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
      sleep 0.5
      kill -0 "$pid" 2>/dev/null && kill -9 -- "-$pid" 2>/dev/null
      print_success "$name stopped (PID $pid)"
    fi
    rm -f "$pid_file"
  fi
  if [ -n "$pattern" ]; then
    pkill -f "$pattern" 2>/dev/null && print_info "Swept orphaned $name processes" || true
  fi
}

# ── LAN / phone helpers ──────────────────────────────────────────────────────
# The MVP web app is fully self-contained (all compute is local, storage is
# localStorage), so exposing it on the LAN needs no proxy and no CORS — just
# bind 0.0.0.0, which `next dev` does by default.
#
# IMPORTANT for this project: service workers only register on a SECURE origin.
# http://localhost is treated as secure, but http://192.168.x.x is NOT — so the
# PWA (install prompt, offline, precache) CANNOT be tested over plain LAN HTTP.
# Use `./scripts/start-web.sh --https` for phone testing; it serves over TLS with
# a locally generated certificate, which makes the origin secure.

is_wsl() { grep -qiE "microsoft|wsl" /proc/version 2>/dev/null; }

detect_lan_ip() {
  local ip=""
  if command_exists ip; then
    ip="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}')"
  fi
  if [ -z "$ip" ] && command_exists hostname; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  fi
  printf '%s' "$ip"
}

# print_web_lan_help [IP] [SCHEME] — print the phone URL and, on WSL2, the
# one-time Windows port-forward + firewall commands needed to reach it.
print_web_lan_help() {
  local ip="${1:-$(detect_lan_ip)}" scheme="${2:-http}"
  [ -n "$ip" ] || { print_warning "Could not detect a LAN IP — phone access unavailable"; return 0; }
  echo -e "${BLUE}On your phone (same Wi-Fi):${NC} ${GREEN}$scheme://$ip:$WEB_PORT${NC}"
  if [ "$scheme" = "http" ]; then
    print_warning "Plain HTTP is not a secure origin — the service worker will NOT register."
    print_warning "For PWA / install / offline testing on a phone, use: ./scripts/start-web.sh --https"
  fi
  if is_wsl; then
    echo -e "${YELLOW}WSL2 detected${NC} — run ONCE in an elevated Windows PowerShell:"
    echo "  netsh interface portproxy add v4tov4 listenport=$WEB_PORT listenaddress=0.0.0.0 connectport=$WEB_PORT connectaddress=$ip"
    echo "  New-NetFirewallRule -DisplayName 'mm-web' -Direction Inbound -LocalPort $WEB_PORT -Protocol TCP -Action Allow"
    echo "  (then browse to <windows-lan-ip>:$WEB_PORT from the phone, not the WSL IP)"
  fi
}
