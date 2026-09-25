#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/rfid-personel-staging"
BRANCH="staging"
SERVICE="rfid-personel-staging"

cd "$APP_DIR"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

npm ci
npm run prisma:generate
npm run db:push
npm run test
npm run lint
npm run build

chown -R www-data:www-data "$APP_DIR/.next"

systemctl restart "$SERVICE"
systemctl is-active --quiet "$SERVICE"

echo "Staging deployment completed successfully."
