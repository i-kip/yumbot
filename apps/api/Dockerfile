FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

# Install deps
FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY packages/remnawave/package.json ./packages/remnawave/
COPY apps/api/package.json ./apps/api/
# --no-frozen-lockfile because lock file is generated on first install
RUN pnpm install --no-frozen-lockfile

# Build remnawave package
FROM deps AS build-pkg
COPY packages/remnawave/ ./packages/remnawave/
COPY tsconfig.base.json ./
RUN pnpm --filter @yumbot/remnawave build

# Build API
FROM build-pkg AS build-api
COPY apps/api/ ./apps/api/
# Generate Prisma client before tsc
RUN cd apps/api && npx prisma generate
RUN pnpm --filter api build

# Production image — only runtime deps
FROM node:20-alpine AS production
RUN npm install -g pnpm@9 prisma@5.22.0
WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY packages/remnawave/package.json ./packages/remnawave/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --prod --no-frozen-lockfile

# Copy prisma schema before generate so client is built against production schema
COPY apps/api/prisma ./apps/api/prisma
RUN cd apps/api && prisma generate

COPY --from=build-api /app/packages/remnawave/dist ./packages/remnawave/dist
COPY --from=build-api /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

CMD ["sh", "-c", "prisma migrate deploy && node dist/index.js"]

EXPOSE 3000
