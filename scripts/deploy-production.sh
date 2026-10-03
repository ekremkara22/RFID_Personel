#!/usr/bin/env bash
set -euo pipefail
umask 022

APP_DIR="/var/www/rfid-personel-takip"
BRANCH="main"
SERVICE="rfid-personel-takip"

cd "$APP_DIR"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

npm ci
npm run prisma:generate
npm run db:migrate:deploy
npm run rbac:migrate
npm run test
npm run lint
npm run build

chown -R www-data:www-data "$APP_DIR/.next"

systemctl restart "$SERVICE"
systemctl is-active --quiet "$SERVICE"

echo "Production deployment completed successfully."
