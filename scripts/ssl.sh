#!/bin/bash
# ============================================================
# SSL certificates with Let's Encrypt
# Run AFTER DNS is pointed to your VDS IP
# ============================================================
set -e

DOMAINS=(
  "api.yumoff.site"
  "boty.yumoff.site"
  "miniy.yumoff.site"
  "lk.yumoff.site"
)

EMAIL="your@email.com"  # ← Change this!

echo "Getting SSL certificates..."

for domain in "${DOMAINS[@]}"; do
  echo "→ $domain"
  certbot certonly \
    --nginx \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$domain" \
    || echo "  Warning: failed for $domain, check DNS"
done

# Copy nginx config
cp /opt/yumbot/nginx/nginx.conf /etc/nginx/conf.d/yumbot.conf
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx

# Auto-renewal
systemctl enable --now certbot.timer

echo "✅ SSL setup complete!"
