# syntax=docker/dockerfile:1.7
# Production image for the money-management NestJS API.
# Build context = repo root:
#   docker build -f infra/Dockerfile.be -t mm-be .
#
# Phase 2 artifact. In the MVP the API only serves /health — it is built and
# deployed so the pipeline is proven before it carries real traffic.

# --- deps -------------------------------------------------------------------
FROM node:20-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc turbo.json ./
COPY apps/be/package.json apps/be/
COPY apps/web/package.json apps/web/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile

# --- build ------------------------------------------------------------------
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /app
COPY --from=deps /app ./
COPY . .
# Prisma client is generated from the schema; it must exist before tsc runs.
RUN pnpm --filter @mm/be run prisma:generate
RUN pnpm turbo run build --filter='./packages/*'
RUN pnpm --filter @mm/be build
# Strip dev dependencies from the tree we are about to copy forward.
RUN pnpm --filter @mm/be --prod deploy /app/bundle

# --- runtime ----------------------------------------------------------------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3100
WORKDIR /app
RUN apk add --no-cache wget
COPY --from=build --chown=node:node /app/bundle ./
USER node
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3100/health || exit 1
CMD ["node", "dist/main.js"]
