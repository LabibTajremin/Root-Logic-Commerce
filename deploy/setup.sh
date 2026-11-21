#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 VPS (Namecheap Spark or similar). Run as root:
#   REPO=https://github.com/<you>/Root-Logic-Commerce.git ACME_EMAIL=you@example.com bash deploy/setup.sh
# Re-running is safe: it updates the code, rebuilds and restarts.
set -euo pipefail
: "${REPO:?set REPO to the git URL}" "${ACME_EMAIL:?set ACME_EMAIL for TLS certificates}"
APP=/opt/rlc/app

apt-get update
apt-get install -y curl git gnupg postgresql debian-keyring debian-archive-keyring apt-transport-https
# Node 22 + pnpm
if ! command -v node >/dev/null || ! node -v | grep -q '^v22'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
corepack enable
npm install -g pm2
# Caddy (official repository)
if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update && apt-get install -y caddy
fi

# Postgres: small footprint (spec §8), one database for every store.
PGCONF=$(sudo -u postgres psql -tAc 'SHOW config_file')
grep -q '^shared_buffers = 128MB' "$PGCONF" || echo 'shared_buffers = 128MB' >> "$PGCONF"
systemctl restart postgresql
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='rlc'" | grep -q 1 || {
  DB_PASS=$(openssl rand -hex 24)
  sudo -u postgres psql -c "CREATE ROLE rlc LOGIN PASSWORD '$DB_PASS'"
  sudo -u postgres createdb -O rlc rlc
  mkdir -p /etc/rlc
  cat > /etc/rlc/env <<ENV
DATABASE_URL=postgres://rlc:$DB_PASS@127.0.0.1:5432/rlc
AUTH_SECRET=$(openssl rand -hex 32)
SETTINGS_KEY=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 24)
HOSTING_PROFILE=vps
MEDIA_DIR=/var/lib/rlc/media
# Fill these in, then: pm2 restart rlc
BOOTSTRAP_OWNER_EMAIL=
BOOTSTRAP_OWNER_PASSWORD=
BOOTSTRAP_HOSTS=
ENV
  chmod 600 /etc/rlc/env
}
mkdir -p /var/lib/rlc/media /var/log/rlc /var/log/caddy

# Code: clone or update, build the standalone server.
if [ -d "$APP/.git" ]; then git -C "$APP" pull --ff-only; else git clone "$REPO" "$APP"; fi
cd "$APP"
pnpm install --frozen-lockfile
pnpm build
cp -r .next/static .next/standalone/.next/static
[ -d public ] && cp -r public .next/standalone/public
set -a && . /etc/rlc/env && set +a
pnpm db:migrate

# Run + proxy + backups.
pm2 startOrReload deploy/ecosystem.config.cjs && pm2 save
pm2 startup systemd -u root --hp /root >/dev/null
pm2 install pm2-logrotate >/dev/null
sed "s/{\$ACME_EMAIL}/$ACME_EMAIL/" deploy/Caddyfile > /etc/caddy/Caddyfile
systemctl reload caddy
install -m 755 deploy/backup.sh /usr/local/bin/rlc-backup
echo '30 2 * * * root /usr/local/bin/rlc-backup' > /etc/cron.d/rlc-backup
echo "Done. Edit /etc/rlc/env (owner login, domains), then: pm2 restart rlc"
