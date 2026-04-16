#!/bin/bash
# ============================================================
# Start / update YumOff VPN stack
# ============================================================
set -e

cd /opt/yumbot

echo "🚀 Starting YumOff VPN..."

# Check .env exists
if [ ! -f .env ]; then
  echo "❌ .env not found! Copy .env.example and fill in values"
  exit 1
fi

# Build & start containers
docker compose pull postgres redis 2>/dev/null || true
docker compose up -d --build

# Wait for DB
echo "Waiting for PostgreSQL..."
sleep 5

# Run migrations
docker compose exec api sh -c "cd /app/apps/api && npx prisma migrate deploy"

# Seed default plans (only first time)
docker compose exec api sh -c "cd /app/apps/api && node dist/seed.js 2>/dev/null || true"

echo "✅ Stack running!"
echo ""
echo "Containers:"
docker compose ps

echo ""
echo "Logs: docker compose logs -f api"
