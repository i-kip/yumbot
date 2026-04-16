#!/bin/bash
# ============================================================
# SSL certificates with Let's Encrypt
# Run AFTER all DNS A-records point to this server IP
# ============================================================
set -e

# ← Change to your real email
EMAIL="your@email.com"

DOMAINS=(
  "api.yumoff.site"
  "miniy.yumoff.site"
  "lk.yumoff.site"
)

echo "Getting SSL certificates..."

# Temp nginx for HTTP challenge (no SSL config needed yet)
cat > /etc/nginx/conf.d/temp-challenge.conf << 'EOF'
server {
    listen 80;
    server_name api.yumoff.site miniy.yumoff.site lk.yumoff.site;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 200 'ok'; }
}
EOF
systemctl reload nginx 2>/dev/null || true

for domain in "${DOMAINS[@]}"; do
  echo "→ $domain"
  certbot certonly \
    --webroot \
    --webroot-path /var/www/html \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$domain" \
    && echo "  ✅ OK" \
    || echo "  ⚠️  Failed — check DNS for $domain"
done

# Remove temp config and install real one
rm -f /etc/nginx/conf.d/temp-challenge.conf
cp /opt/yumbot/nginx/nginx.conf /etc/nginx/conf.d/yumbot.conf
rm -f /etc/nginx/sites-enabled/default

echo ""
echo "Testing nginx config..."
if nginx -t; then
  systemctl reload nginx
  echo "✅ Nginx reloaded successfully"
else
  echo "❌ Nginx config error — check above"
  echo "   Missing certs? Run: certbot certonly --nginx -d DOMAIN"
  exit 1
fi

# Auto-renewal cron
systemctl enable --now certbot.timer 2>/dev/null || true

echo ""
echo "✅ SSL setup complete!"
echo "   Certs location: /etc/letsencrypt/live/"
