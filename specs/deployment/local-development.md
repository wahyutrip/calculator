# Deployment — Local Development

## First time

```bash
git clone <repo> && cd money-management
./scripts/setup.sh
```

`setup.sh` checks prerequisites, creates env files from the examples, installs
every workspace with pnpm, and builds the shared packages. It needs **no Docker
and no database** — the MVP calculator computes in the browser and persists to
localStorage.

Prerequisites: Node ≥ 20 and pnpm 9.12.0 (`corepack enable` provides it).

Working on the Phase 2 API instead:

```bash
./scripts/setup.sh --with-be    # also starts Postgres and runs migrations
```

## Day to day

```bash
./scripts/start.sh              # web on http://localhost:4220
./scripts/start.sh --with-be    # web + API + Postgres
./scripts/stop.sh               # stop; add --infra to stop Docker too
```

`start.sh` runs services in the background with PID files and logs under
`logs/`, waits for them to answer, prints the URLs, then streams the logs.
Ctrl+C stops what it started.

Single service, foreground:

```bash
./scripts/start-web.sh          # just the web app
./scripts/start-be.sh           # just the API (starts Postgres if needed)
```

Every script takes `--help`.

## Ports

| Service | This checkout | Documented default | Source of truth |
|---|---|---|---|
| Web | **4220** | 3001 | `apps/web/.env.local` → `WEB_PORT` |
| API | **4210** | 3000 | `apps/be/.env.local` → `PORT` |
| Postgres | 5433 | 5432 | `infra/.env` → `POSTGRES_PORT` |
| Adminer | 8081 | 8080 | `infra/.env` → `ADMINER_PORT` |

Precedence, highest first: an exported env var → the app's `.env.local` → the
default in `scripts/lib/common.sh`. So `WEB_PORT=4000 ./scripts/start-web.sh`
works as a one-off, and moving a port permanently only means editing
`.env.local` — never a script.

The defaults are the conventional 3000/3001; this checkout pins 4210/4220
because sekar and swat already hold 3000/3001 on the same machine.

## Reaching it from your phone

Both apps bind `0.0.0.0`, and the start scripts print the LAN URL:

```
On your phone (same Wi-Fi): http://172.25.165.11:4220
```

Next 15 rejects dev requests from an origin it was not told about, so
`setup_web_lan_env` allow-lists the LAN origin for the child process only —
`.env.local` is never rewritten. On WSL2 the script also prints the one-time
Windows `netsh portproxy` and firewall commands, because the phone reaches the
Windows host, not the WSL VM.

## Testing the PWA on a real phone

This is the part that trips everyone up.

`next dev` binds `0.0.0.0`, so `http://<your-lan-ip>:4220` reaches the app from
a phone on the same Wi-Fi. **But service workers only register on a secure
origin.** `http://localhost` counts as secure; `http://192.168.x.x` does not. So
over plain LAN HTTP the service worker silently never registers, the install
prompt never appears, and offline does not work — with nothing in the console
explaining why.

```bash
./scripts/start-web.sh --https
```

serves over TLS with a locally generated certificate. Accept the warning once on
the phone. The script prints the URL, and on WSL2 also prints the one-time
Windows `netsh portproxy` and firewall commands needed to reach the WSL VM from
the LAN.

## Common tasks

```bash
pnpm test                              # everything
pnpm --filter @mm/calc test:cov        # engine coverage — must be 100% branches
pnpm --filter @mm/web test:e2e         # Playwright
pnpm lint && pnpm typecheck
pnpm --filter @mm/web build            # production build locally
pnpm tickers:refresh --dry-run         # diff the IDX ticker list
```

## Troubleshooting

**`next dev` cannot resolve `@mm/calc`.** The shared packages have not been
built. `pnpm turbo run build --filter='./packages/*'`, or re-run `setup.sh`.

**Port already in use.** The scripts free the port before starting, but a
process outside their PID files survives. `./scripts/stop.sh` sweeps by pattern
too; failing that, `lsof -ti tcp:4220 | xargs kill -9`.

**Stale service worker in dev.** DevTools → Application → Service Workers →
Unregister, and tick "Update on reload" while working on it. A cached SW from an
earlier session will serve you an old bundle and make you doubt your own build.

**Migrations fail after changing infra ports.** `apps/be/.env.local`'s
`DATABASE_URL` still points at the old port. `setup.sh --with-be` calls
`sync_backend_infra_ports` to fix this automatically; run it again.

**Changes to `packages/*` are not picked up.** Run the package's `dev` script so
its `dist/` rebuilds on change, or rebuild it once — `apps/web` imports built
output, not source.
