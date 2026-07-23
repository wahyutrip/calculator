# Deployment — CI/CD

GitHub Actions. Two workflows: `ci.yml` on every push and PR, `deploy.yml` on
push to `main` (and manual dispatch).

## Pipeline

```
push / PR ──▶ ci.yml
              ├─ install (pnpm, frozen lockfile, cached store)
              ├─ lint            eslint
              ├─ typecheck       tsc --noEmit, all workspaces
              ├─ test            vitest — @mm/calc gated at 100% branches
              ├─ build           turbo build
              ├─ e2e             playwright, chromium + mobile-safari viewport
              └─ lighthouse      PWA installable · mobile performance ≥ 90

main ────────▶ deploy.yml   (needs: ci)
              ├─ build + push  mm-web:<sha>  →  ECR ap-southeast-3
              ├─ build         mm-be:<sha>   →  ECR (built, not deployed)
              ├─ ship          calculator.caddy → ~/sekar/infra/conf.d/
              ├─ ship          compose.prod.yml → ~/mm/
              ├─ pull + up --wait
              ├─ restart       sekar-caddy
              └─ smoke         verify the deploy actually serves
```

Every step is a gate. A red step stops the pipeline; nothing is `continue-on-error`.

## Why these gates

- **100% branch coverage on `@mm/calc`** — the entire product is this arithmetic
  being correct. Coverage below 100% here means an untested branch decides how
  many lots someone buys.
- **Lighthouse in CI** — "installable PWA" is a release requirement, and
  requirements that are only checked manually stop being checked.
- **E2E at a mobile viewport** — mobile is the primary target, so the primary
  target is what CI exercises.

## Deploy access

OIDC, not long-lived keys. The workflow assumes an IAM role scoped to ECR push
for the `mm-*` repositories only. SSH to the box uses a deploy key held in
GitHub Secrets.

| Secret | Purpose |
|---|---|
| `AWS_ROLE_ARN` | OIDC role for ECR |
| `DEPLOY_SSH_KEY` | SSH to the EC2 box |
| `DEPLOY_HOST` / `DEPLOY_USER` | Box address and user |

No application secrets exist in the MVP. `NEXT_PUBLIC_APP_URL` is baked at build
time and is public by definition.

## Smoke test

The deploy is not "done" when compose returns. It is done when these pass:

```bash
curl -fsS -o /dev/null -w '%{http_code}' https://calculator.wahyutrip.com/          # 200
curl -fsS https://calculator.wahyutrip.com/manifest.webmanifest | jq -e .name       # valid
curl -fsSI https://calculator.wahyutrip.com/sw.js | grep -i 'must-revalidate'       # not cached
```

The manifest check exists because a missing `public/` copy in the Docker image
breaks installability **without breaking the page** — the app looks perfectly
fine and quietly stops being a PWA. Only an explicit assertion catches it.

A failed smoke test fails the workflow loudly. It does not auto-roll-back: an
automatic rollback on a flaky check can flap between two versions, which is
worse than one bad version plus a human. Rollback is one command
(`specs/deployment/infrastructure.md`).

## Concurrency and caching

```yaml
concurrency:
  group: deploy-production
  cancel-in-progress: false
```

Deploys queue rather than cancel. Cancelling a deploy mid-`docker compose up`
leaves the box in a state no one has reasoned about.

pnpm store and Turbo cache are keyed on the lockfile. Docker layers use GitHub
Actions cache; the `deps` stage only rebuilds when a manifest changes.

## Branching

`main` is protected and always deployable. Work happens on `feat/*` / `fix/*`
branches merged by PR with CI green. Conventional commits are enforced locally
by commitlint and re-checked in CI.

Tags `v*` mark releases and generate release notes from the commit history.
