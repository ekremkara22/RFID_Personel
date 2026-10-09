#!/usr/bin/env bash
set -euo pipefail
umask 022

APP_DIR="/var/www/rfid-personel-staging"
BRANCH="staging"
SERVICE="rfid-personel-staging"

cd "$APP_DIR"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

npm ci
npm run prisma:generate
npm run db:migrate:deploy
npm run rbac:migrate:staging
npm run test
npm run lint
npm run build

chown -R www-data:www-data "$APP_DIR/.next" "$APP_DIR/src/generated"

install -m 0644 "$APP_DIR/deploy/staging/rfid-personel-staging-attendance-finalizer.service" /etc/systemd/system/rfid-personel-staging-attendance-finalizer.service
install -m 0644 "$APP_DIR/deploy/staging/rfid-personel-staging-attendance-finalizer.timer" /etc/systemd/system/rfid-personel-staging-attendance-finalizer.timer
systemctl daemon-reload
systemctl enable --now rfid-personel-staging-attendance-finalizer.timer

systemctl restart "$SERVICE"
systemctl is-active --quiet "$SERVICE"

echo "Staging deployment completed successfully."
