# Deployment — Environment Variables

The MVP has almost none, which is a feature. Every variable listed here exists
because something genuinely differs between environments.

## Rules

- **No secrets in the MVP.** The web app handles no credentials. Anything
  prefixed `NEXT_PUBLIC_` is compiled into the client bundle and is public by
  definition — never put anything sensitive behind that prefix and assume the
  prefix protects it.
- **Fail loudly.** Missing required config throws at startup with the variable
  named. A silent fallback to a default is how the wrong API URL reaches
  production.
- **`.env*` files are never committed.** Only `.env*.example` files are, and
  they carry every key with safe placeholder values.
- **`NEXT_PUBLIC_*` are baked at build time.** Changing one requires a rebuild,
  not a restart. This surprises people every time.

## `apps/web`

| Variable | Dev | Production | Required | Purpose |
|---|---|---|---|---|
| `WEB_PORT` | `3101` | `3101` | no | Dev server port. Read by the scripts, not by Next. |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3101` | `https://calculator.wahyutrip.com` | yes | Canonical URL for metadata, Open Graph, and share links. |
| `NEXT_PUBLIC_API_BASE_URL` | — | — | no | **Phase 2.** Unset in the MVP; the app makes no API calls. |
| `NEXT_TELEMETRY_DISABLED` | — | `1` | no | Next.js telemetry off in images. |

## `apps/be` — Phase 2, scaffolded

| Variable | Dev | Production | Required | Purpose |
|---|---|---|---|---|
| `PORT` | `3100` | `3100` | no | API port. |
| `NODE_ENV` | `development` | `production` | yes | |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5433/mm_dev` | RDS URL, from SSM | yes | Prisma connection. |
| `LOG_LEVEL` | `debug` | `info` | no | |
| `CORS_ORIGIN` | `http://localhost:3101` | `https://calculator.wahyutrip.com` | yes | Explicit allow-list. Never `*` once auth exists. |

Config is validated with zod at boot. A missing or malformed `DATABASE_URL`
crashes the process with a readable message rather than failing on first query.

## `infra/.env` — local Docker only

| Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_USER` | `postgres` | |
| `POSTGRES_PASSWORD` | `postgres` | Local only. Production credentials come from SSM. |
| `POSTGRES_DB` | `mm_dev` | |
| `POSTGRES_PORT` | `5433` | Non-standard — sekar/swat hold 5432. |
| `ADMINER_PORT` | `8081` | Non-standard — sekar/swat hold 8080. |

## Production build args

`infra/Dockerfile.web` takes `NEXT_PUBLIC_APP_URL` as a build arg, defaulting to
the production URL. `compose.prod.yml` sets only runtime values (`NODE_ENV`,
`PORT`, `HOSTNAME`) — the public URL is already inside the image.

## Phase 2 secrets

When auth and payments arrive, secrets go to **AWS SSM Parameter Store** as
`SecureString` under `/mm/production/*`, materialised on the box at deploy time —
the pattern both sekar and swat already use (`seed-env-from-ssm.sh`). They do
not go in GitHub Secrets, in the image, or in the repo, encrypted or otherwise.

Anticipated: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
`MIDTRANS_SERVER_KEY`, `SMTP_*`. All are backend-only and none may ever acquire
a `NEXT_PUBLIC_` prefix.
