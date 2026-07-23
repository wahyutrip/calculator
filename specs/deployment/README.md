# Deployment

| Document | Read it when |
|---|---|
| [local-development.md](local-development.md) | Getting it running on your machine |
| [infrastructure.md](infrastructure.md) | Understanding the AWS box and the co-tenancy rules |
| [ci-cd.md](ci-cd.md) | Changing the pipeline, or a deploy failed |
| [environment-variables.md](environment-variables.md) | Adding or changing configuration |

## The short version

`calculator.wahyutrip.com` is one stateless container (`mm-web`) on the shared
dlhsby EC2 box, behind the Caddy that sekar owns, reached over the shared `edge`
Docker network. The MVP has no database and no secrets.

```bash
./scripts/setup.sh     # once
./scripts/start.sh     # every day
```

Deploys are automatic on merge to `main`.

## Five things that will bite you

1. **Never edit the box Caddyfile.** Sekar's deploy regenerates it and will wipe
   your block. Use the drop-in `infra/calculator.caddy`.
2. **Restart `sekar-caddy` after every deploy** or you get 502s — Caddy caches
   the upstream container IP.
3. **`public/` must be copied explicitly in the Docker image.** Miss it and the
   app looks fine but silently stops being installable.
4. **`sw.js` must never be cached.** A stale service worker pins users to an old
   build permanently and no redeploy reaches them.
5. **The PWA cannot be tested over plain LAN HTTP.** Service workers need a
   secure origin — use `./scripts/start-web.sh --https`.
