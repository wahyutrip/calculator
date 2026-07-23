# Deployment — Infrastructure

## Where this runs

The shared **dlhsby EC2 box**, in `ap-southeast-3` (Jakarta). It already hosts
sekar and swat. We are the third tenant, adding one small container.

A separate instance was considered and rejected: the MVP is a single stateless
Node process serving static-ish content to an unproven audience. A new EC2
instance, its own Elastic IP, and its own TLS automation would cost real money
and real operational surface to serve a workload the existing box will not
notice.

```
DNS  calculator.wahyutrip.com  A ──▶ <box Elastic IP>   (already configured)

┌───────────────────────── EC2 (shared) ─────────────────────────┐
│                                                                 │
│  sekar-caddy  :80 :443     ← owns TLS for the whole box         │
│    ├─ Caddyfile                     (sekar's, regenerated)      │
│    └─ import /etc/caddy/conf.d/*.caddy                          │
│         ├─ swat.caddy               (swat's drop-in)            │
│         └─ calculator.caddy         (OURS)                      │
│                                                                 │
│  docker network `edge` (external)                               │
│    ├─ sekar-web · sekar-backend                                 │
│    ├─ swat-web · swat-backend                                   │
│    └─ mm-web :3101                  ← OURS                      │
│                                                                 │
│  AWS RDS `dlhsby` ── Postgres. Phase 2 only; MVP uses no DB.    │
│  AWS ECR ap-southeast-3 ── mm-web images                        │
└─────────────────────────────────────────────────────────────────┘
```

## The co-tenancy rules

These are not style preferences. Each has already caused an outage on this box.

**1. Never run your own Caddy.** Ports 80 and 443 are taken. A second Caddy
fails to bind and, worse, may take the first one's certificates with it.

**2. Never edit the box Caddyfile.** Sekar's deploy *regenerates* it from
sekar's repo on every release. Anything appended there disappears at sekar's
next deploy — this is exactly how SWAT went down once. Our vhost is a **drop-in**
at `conf.d/calculator.caddy`, which sekar's deploy never touches.

**3. Never publish ports.** Use `expose`, and let Caddy reach the container by
name over the `edge` network. A published port on a shared box is an
unauthenticated service on the public internet.

**4. Always set `mem_limit`.** An unbounded Node process here degrades sekar and
swat, not just us. Ours is 256MB.

**5. Restart `sekar-caddy` after every deploy.** Docker gives a recreated
container a new IP and Caddy caches the upstream resolution. Skipping this
produces 502s that look like an application bug.

**6. `docker network create edge` must exist before first deploy.** It is
external to every stack so no single project's `compose down` can delete it.

## Images

Registry: `659828096624.dkr.ecr.ap-southeast-3.amazonaws.com` — the same
account and region swat uses.

| Repository | Built from | Deployed |
|---|---|---|
| `mm-web` | `infra/Dockerfile.web` | Yes |
| `mm-be` | `infra/Dockerfile.be` | Built in CI, **not** deployed in the MVP |

Tagged with the full git SHA. `latest` is a convenience alias only; deployments
always name an explicit SHA, because a deploy you cannot name is a deploy you
cannot roll back.

Lifecycle policy: keep the 20 most recent images, expire untagged after 7 days.

`mm-be` is built but its compose service stays commented out. An idle container
answering only `/health` would consume memory on a shared box for no benefit —
but a Dockerfile that has never been built is a Dockerfile that does not work,
and Phase 2 should discover that in CI, not on deploy day.

## TLS

Caddy provisions and renews Let's Encrypt certificates automatically. Nothing to
configure beyond the bare hostname in `calculator.caddy`.

HSTS is set with a one-year max-age and `includeSubDomains`. It is **not**
preloaded: preloading is effectively irreversible and applies to the whole
`wahyutrip.com` tree, which is not this project's decision to make.

## Backups

The MVP stores nothing server-side. There is nothing to back up, and saying so
explicitly is better than leaving it ambiguous.

The user-facing consequence is real, though: plans live in one browser. This is
disclosed in the UI (`specs/features/portfolio-plans.md` §1), not buried here.

Phase 2 inherits RDS automated backups (7-day retention) from the existing
`dlhsby` instance configuration.

## Monitoring

MVP-appropriate, which means small:

- Container healthcheck → `restart: unless-stopped` handles a hung process.
- Caddy access log at `/var/log/caddy/calculator.log`, rolling at 10MB × 5.
- The existing box-level disk-space alarm covers us; log rolling keeps us from
  being the project that fills the disk.

Deliberately not yet: APM, error tracking, uptime pinging. They arrive with
Phase 2, when there is an account to lose and a transaction to fail. Adding them
now would be monitoring a page that cannot fail in an interesting way.

## Rollback

```bash
ssh ec2-user@<box> "cd ~/mm && IMAGE_TAG=<previous-sha> \
  docker compose -f compose.prod.yml up -d --wait && docker restart sekar-caddy"
```

Under two minutes, no build required, because images are SHA-tagged and retained.
If the Caddy drop-in itself is at fault, `git checkout` the previous
`calculator.caddy`, scp it, and restart the container.
