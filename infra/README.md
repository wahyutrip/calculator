# infra/

Everything needed to run the stack in Docker, locally and on AWS.

| File | Purpose |
|---|---|
| `docker-compose.yml` | Local dev services — Postgres + Adminer. **Phase 2 only**; the MVP needs none of it. |
| `compose.prod.yml` | AWS production stack. One container (`mm-web`) on the shared `edge` network. |
| `Dockerfile.web` | Multi-stage build of the Next.js app → standalone runtime. |
| `Dockerfile.be` | Multi-stage build of the NestJS API. Phase 2. |
| `calculator.caddy` | Caddy **drop-in** for `calculator.wahyutrip.com`. Deployed into sekar's `conf.d/`. |
| `.env.example` | Local infra settings. Copied to `.env` by `scripts/setup.sh`. |

## The one thing to understand first

We do **not** run our own Caddy. The dlhsby EC2 box already has one, owned by
sekar's compose stack, and it already binds 80/443. Both sekar and swat serve
through it. We are the third tenant.

```
                       ┌──────────────────────────────────────┐
   DNS A records ──────▶  EC2 (shared) · Elastic IP           │
   *.wahyutrip.com     │                                      │
                       │  sekar-caddy  :80 :443  ◀── owns TLS │
                       │    ├── Caddyfile         (sekar's)   │
                       │    └── import conf.d/*.caddy         │
                       │          ├── swat.caddy              │
                       │          └── calculator.caddy  ← us  │
                       │                                      │
                       │  docker network `edge` (external)    │
                       │    ├── sekar-web, sekar-backend      │
                       │    ├── swat-web, swat-backend        │
                       │    └── mm-web :3101            ← us  │
                       └──────────────────────────────────────┘
```

Why a drop-in instead of adding a block to the box Caddyfile: sekar's deploy
regenerates that file from its own repo on every release and would wipe anything
appended to it — this has already caused one SWAT outage. `conf.d/` is never
touched by sekar's deploy, so our vhost survives their releases.

## First deploy onto the box

Once, as a prerequisite:

```bash
# The shared network must exist. Harmless if it already does.
docker network create edge 2>/dev/null || true
```

Then per release (this is what CI automates — see `specs/deployment/ci-cd.md`):

```bash
# 1. Ship the vhost (sekar's deploy never overwrites conf.d/)
scp infra/calculator.caddy ec2-user@<box>:~/sekar/infra/conf.d/calculator.caddy

# 2. Ship the compose file and pull the new image
scp infra/compose.prod.yml ec2-user@<box>:~/mm/compose.prod.yml
ssh ec2-user@<box> "cd ~/mm && IMAGE_TAG=<git-sha> docker compose -f compose.prod.yml pull"

# 3. Roll it, waiting for the healthcheck rather than assuming success
ssh ec2-user@<box> "cd ~/mm && IMAGE_TAG=<git-sha> docker compose -f compose.prod.yml up -d --wait"

# 4. Restart Caddy so it re-resolves the new container IP
ssh ec2-user@<box> "docker restart sekar-caddy"
```

Step 4 is not optional. Docker assigns the recreated `mm-web` a new IP, and
Caddy caches the upstream resolution — skip it and you get 502s that look like
an application failure.

## Local

```bash
./scripts/infra.sh start    # Postgres + Adminer
./scripts/infra.sh status
./scripts/infra.sh stop     # keeps data
./scripts/infra.sh down     # WIPES the database
```

## Things that will bite you

- **`public/` in the web image.** Next's standalone output does not trace
  `public/` or `.next/static`. `Dockerfile.web` copies both explicitly. If that
  copy is dropped, the app still boots and looks fine — but the manifest and
  icons 404 and the PWA silently stops being installable. There is no error to
  read; check `curl -I https://calculator.wahyutrip.com/manifest.webmanifest`.
- **`NEXT_PUBLIC_*` are baked at build time.** Changing the app URL means a
  rebuild, not a restart.
- **`sw.js` must not be cached.** `calculator.caddy` sets `must-revalidate` on
  it. A stale service worker pins a user to an old build permanently, and you
  cannot fix it for them by redeploying.
- **Memory on a shared box.** sekar and swat are neighbours. Keep `mem_limit`
  set; an unbounded Node process here degrades their services, not just ours.
