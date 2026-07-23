# scripts/

One entry point per task. Every script takes `--help`.

| Script | Use |
|---|---|
| `setup.sh` | **Once per checkout.** Prerequisites, env files, install, build packages. |
| `start.sh` | **Day to day.** Starts the stack, waits for it, streams logs. Ctrl+C stops it. |
| `start-web.sh` | Web only, foreground. `--https` for PWA testing on a phone. |
| `start-be.sh` | API only, foreground. Starts Postgres if needed. |
| `stop.sh` | Stop the services. `--infra` also stops Docker. |
| `infra.sh` | Postgres + Adminer directly. `start`/`stop`/`down`/`status`. |
| `lib/common.sh` | Shared helpers. Sourced, never run. |

Also available as `pnpm setup`, `pnpm start`, `pnpm start:web`, `pnpm stop`,
`pnpm infra`.

## The usual path

```bash
./scripts/setup.sh     # once
./scripts/start.sh     # http://localhost:4220
```

The MVP needs **no Docker and no database** — the calculator computes in the
browser and persists to localStorage. Add `--with-be` to either script when
working on the Phase 2 API.

## Testing the PWA on a phone

```bash
./scripts/start-web.sh --https
```

Service workers only register on a secure origin. `http://localhost` counts;
`http://192.168.x.x` does not — so over plain LAN HTTP the service worker
silently never registers and the install prompt never appears, with no console
error explaining why. The script prints the phone URL and, on WSL2, the one-time
Windows port-forward and firewall commands.

## Ports

This checkout: web **4220** · API **4210** · Postgres 5433 · Adminer 8081.
Documented defaults are the conventional 3001 / 3000 / 5432 / 8080.

sekar and swat already hold 3000/3001 on this machine, which is why `.env.local`
pins 4210/4220. Precedence is exported var → `.env.local` → default, so
`WEB_PORT=4000 ./scripts/start-web.sh` works as a one-off and a permanent change
only means editing `.env.local`.

Both apps bind `0.0.0.0`; the start scripts print the phone URL and, on WSL2, the
one-time Windows portproxy commands.

## Conventions

- `set -e`; every script sources `lib/common.sh` and uses its `print_*` helpers.
- Background services get a PID file and a log under `logs/`, started with
  `setsid` so the whole process group can be killed — `next dev` spawns children
  that otherwise survive as orphans still holding the port.
- Scripts free their port before binding, and sweep stale PID files first: a
  killed listener with a live orphaned parent makes `start_bg` report "already
  running" and then hang on the health check.
- Destructive actions (`infra.sh down`) warn and name what they destroy.
