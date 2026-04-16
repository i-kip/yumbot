FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

# Install deps
FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY packages/remnawave/package.json ./packages/remnawave/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# Build remnawave package
FROM deps AS build-pkg
COPY packages/remnawave/ ./packages/remnawave/
COPY tsconfig.base.json ./
RUN pnpm --filter @yumbot/remnawave build

# Build API
FROM build-pkg AS build-api
COPY apps/api/ ./apps/api/
RUN pnpm --filter api build

# Production image
FROM node:20-alpine AS production
RUN npm install -g pnpm@9
WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY packages/remnawave/package.json ./packages/remnawave/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --prod --frozen-lockfile

COPY --from=build-api /app/packages/remnawave/dist ./packages/remnawave/dist
COPY --from=build-api /app/apps/api/dist ./apps/api/dist
COPY apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

EXPOSE 3000
