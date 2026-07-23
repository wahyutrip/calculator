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

## Release flow

```
feature branch ──PR──▶ main ──PR (approval)──▶ staging ──▶ deploy
```

`main` and `staging` are both protected and require the three CI checks. Merging
`main` → `staging` triggers `deploy-staging.yml`, which pauses on the `staging`
environment's required reviewer before building anything.

## Deploy access

OIDC, not long-lived keys, and no SSH at all — the box is reached with SSM Run
Command. Repository **Variables**: `AWS_REGION`, `AWS_ROLE_ARN`, `ECR_WEB`,
`EC2_INSTANCE_ID`. The only **Secret** is `WEB_DOTENV_PRIVATE_KEY`, scoped to the
`staging` environment, which decrypts `infra/env/web/.env.staging` during the
build.

> **The OIDC trust condition is not the obvious one.** This account emits
> GitHub's *immutable identifier* subjects, so the claim is
> `repo:wahyutrip@35023823/calculator@1309956035:environment:staging` — the owner
> and repo IDs are embedded. A trust policy matching `repo:wahyutrip/calculator:*`
> never matches and fails with a bare "Not authorized to perform
> sts:AssumeRoleWithWebIdentity", which points nowhere useful. The IDs are
> immutable, so this form also survives a rename. If the role ever needs
> recreating, read the claim rather than guessing it.

No application secrets exist in the MVP. `NEXT_PUBLIC_APP_URL` is public by
definition and baked at build time.

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
automatic rollback on a flaky check can flap between two versions, which is worse
than one bad version plus a human. Rollback is one command
(`specs/deployment/infrastructure.md`).

The deploy also asserts that **sekar and swat still answer** afterwards. We share
their box; a deploy that takes a neighbour down is a failed deploy even when our
own app is fine.

> **Capture, then grep.** Piping `curl` into `grep -q` makes grep exit at the
> first match and close the pipe; `curl` then dies with exit 23 and `pipefail`
> fails the step even though the assertion passed. Assign to a variable first.

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
