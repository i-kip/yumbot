#!/bin/bash
# ============================================================
# Fix all issues and restart YumOff VPN
# Run on server: bash /opt/yumbot/scripts/fix-and-restart.sh
# ============================================================
set -e

cd /opt/yumbot

echo "📥 Pulling latest code..."
git pull origin main

echo ""
echo "🔧 Fixing nginx config..."
# Remove old broken config
rm -f /etc/nginx/conf.d/yumbot.conf /etc/nginx/conf.d/temp-challenge.conf
rm -f /etc/nginx/sites-enabled/default

# Install new config (without boty.yumoff.site)
cp nginx/nginx.conf /etc/nginx/conf.d/yumbot.conf

echo "🔒 Getting missing SSL certs..."

# Get certs for missing domains (skip already obtained ones)
EMAIL=$(grep -oP 'EMAIL="\K[^"]+' scripts/ssl.sh 2>/dev/null || echo "")
if [ -z "$EMAIL" ] || [ "$EMAIL" = "your@email.com" ]; then
  echo "⚠️  Set your email in scripts/ssl.sh first!"
  echo "   nano /opt/yumbot/scripts/ssl.sh"
  echo "   Then rerun this script"
  exit 1
fi

for domain in api.yumoff.site miniy.yumoff.site lk.yumoff.site; do
  if [ ! -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
    echo "  → Getting cert for $domain"
    certbot certonly --nginx --non-interactive --agree-tos \
      --email "$EMAIL" -d "$domain" \
      && echo "  ✅ $domain" || echo "  ⚠️  Failed: $domain (check DNS)"
  else
    echo "  ✓ $domain already has cert"
  fi
done

echo ""
echo "🧪 Testing nginx config..."
if nginx -t 2>&1; then
  systemctl reload nginx
  echo "✅ Nginx OK"
else
  echo "❌ Nginx config failed"
  exit 1
fi

echo ""
echo "🐳 Rebuilding Docker containers..."
docker compose build api
docker compose up -d
docker image prune -f

echo ""
echo "⏳ Waiting for containers to start..."
sleep 8

echo ""
echo "📊 Status:"
docker compose ps

echo ""
echo "✅ All done!"
echo ""
echo "Check logs: docker compose logs -f api"
