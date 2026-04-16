#!/bin/bash
# ============================================================
# YumOff VPN — VDS Setup Script (Ubuntu 24.04)
# Run as root: bash setup-vds.sh
# ============================================================
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }

# ── 1. System update ──────────────────────────────────────
info "Updating system..."
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq curl git wget unzip nginx certbot python3-certbot-nginx ufw

# ── 2. Docker ─────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  info "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  success "Docker installed"
else
  success "Docker already installed"
fi

# ── 3. Node.js 20 ─────────────────────────────────────────
if ! command -v node &>/dev/null; then
  info "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  npm install -g pnpm@9
  success "Node.js installed"
fi

# ── 4. Firewall ───────────────────────────────────────────
info "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
success "Firewall configured"

# ── 5. Project directory ──────────────────────────────────
info "Setting up project directory..."
mkdir -p /opt/yumbot
mkdir -p /var/www/mini-app
mkdir -p /var/www/web
mkdir -p /var/log/nginx

# ── 6. Clone or pull repo ─────────────────────────────────
if [ ! -d "/opt/yumbot/.git" ]; then
  warn "Please clone your repo manually:"
  echo ""
  echo "  cd /opt/yumbot"
  echo "  git clone https://github.com/YOUR_USERNAME/yumbot.git ."
  echo ""
  echo "Then copy .env file and run: bash scripts/start.sh"
else
  info "Repo already cloned, pulling latest..."
  cd /opt/yumbot && git pull
fi

# ── 7. SSH key for GitHub Actions ─────────────────────────
if [ ! -f ~/.ssh/github_deploy ]; then
  info "Generating SSH deploy key..."
  ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N "" -C "github-actions-deploy"
  echo ""
  echo -e "${YELLOW}════════════════════════════════════════════════════${NC}"
  echo -e "${YELLOW}Add this PUBLIC key to GitHub → Settings → Deploy keys${NC}"
  echo -e "${YELLOW}════════════════════════════════════════════════════${NC}"
  cat ~/.ssh/github_deploy.pub
  echo ""
  echo -e "${YELLOW}Add this PRIVATE key to GitHub → Settings → Secrets → VDS_SSH_KEY${NC}"
  cat ~/.ssh/github_deploy
  echo ""
fi

success "VDS setup complete!"
echo ""
echo "Next steps:"
echo "  1. Clone your repo to /opt/yumbot"
echo "  2. Copy .env.example to .env and fill in values: nano /opt/yumbot/.env"
echo "  3. Run SSL setup: bash /opt/yumbot/scripts/ssl.sh"
echo "  4. Run start: bash /opt/yumbot/scripts/start.sh"
