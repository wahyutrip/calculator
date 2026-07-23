#!/bin/bash
# Runs ON the shared dlhsby EC2 box, delivered by SSM Run Command.
#
# This lives in its own file rather than inline in the workflow on purpose: a
# large shell script nested inside YAML inside an `aws ssm --parameters` argument
# needs three levels of quoting, and getting one wrong silently produces a script
# that runs but does the wrong thing (a literal `\$(...)` instead of a command
# substitution, for example).
#
# Required environment:
#   IMAGE_TAG     git sha to deploy
#   COMPOSE_B64   base64 of infra/compose.prod.yml
#   CADDY_B64     base64 of infra/calculator.caddy
#
# Runs as ec2-user, NOT root: the ECR credential helper is configured in
# ec2-user's ~/.docker/config.json, so a root pull fails with "no basic auth
# credentials". ec2-user also owns these directories, so no chown is needed.
#
# CO-TENANCY: sekar, swat and portal share this box. Every rule below has already
# caused an outage for one of them — see specs/deployment/infrastructure.md.
set -euo pipefail

: "${IMAGE_TAG:?IMAGE_TAG is required}"
: "${COMPOSE_B64:?COMPOSE_B64 is required}"
: "${CADDY_B64:?CADDY_B64 is required}"

MM_DIR=/home/ec2-user/mm
SEKAR_CONFD=/home/ec2-user/sekar/infra/conf.d

echo "==> deploying mm-web:${IMAGE_TAG}"

mkdir -p "$MM_DIR" "$SEKAR_CONFD"

# Our vhost is a DROP-IN. sekar's deploy REGENERATES the box Caddyfile from its
# own repo on every release and would wipe anything appended there — that is
# exactly what once took swat down. sekar never touches conf.d/.
printf '%s' "$CADDY_B64" | base64 -d > "$SEKAR_CONFD/calculator.caddy"
printf '%s' "$COMPOSE_B64" | base64 -d > "$MM_DIR/compose.prod.yml"

# External so no single project's `compose down` can delete it.
docker network create edge 2>/dev/null || true

cd "$MM_DIR"
export IMAGE_TAG

# Reclaim disk BEFORE pulling. The box accumulates one image set per deploy
# across four projects and has hit "no space left on device" mid-pull. Running
# containers keep their images, so this only drops unused layers — never volumes
# and never Caddy's certificates.
docker image prune -af >/dev/null 2>&1 || true
df -h / | tail -1

docker compose -f compose.prod.yml pull --quiet
docker compose -f compose.prod.yml up -d --force-recreate --wait

# Reload, do NOT restart. Adding a file to the bind-mounted conf.d/ DIRECTORY
# does not swap the parent inode, so Caddy picks it up with zero downtime for
# sekar, swat and portal. A restart would drop TLS for all of them briefly.
if docker exec sekar-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile; then
  echo "==> caddy reloaded (co-tenants undisturbed)"
else
  echo "==> caddy reload FAILED; falling back to restart" >&2
  docker restart sekar-caddy
fi

# Fail loudly if the running container is not the image we just built — otherwise
# a stale container would sail through the smoke test as a false positive.
RUNNING="$(docker inspect mm-web --format '{{.Config.Image}}')"
echo "==> running image: ${RUNNING} (expected tag ${IMAGE_TAG})"
case "$RUNNING" in
  *:"${IMAGE_TAG}") echo "DEPLOY-VERIFIED ${IMAGE_TAG}" ;;
  *) echo "Running image does not match the deployed tag" >&2; exit 1 ;;
esac
