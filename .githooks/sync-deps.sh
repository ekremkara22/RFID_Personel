#!/bin/sh
# Keeps a developer checkout runnable after `git pull`: reinstalls packages when package-lock.json
# changed and regenerates the Prisma client when the schema changed. Called by post-merge and
# post-rewrite; can also be run by hand: sh .githooks/sync-deps.sh <old-commit> <new-commit>.
# Database migrations are never applied here.

old="${1:-ORIG_HEAD}"
new="${2:-HEAD}"
changed=$(git diff --name-only "$old" "$new" 2>/dev/null) || exit 0

if printf '%s\n' "$changed" | grep -qx 'package-lock.json'; then
  echo "[sync-deps] package-lock.json değişti: npm ci çalışıyor..."
  if ! npm ci --no-audit --no-fund; then
    echo "[sync-deps] npm ci başarısız oldu. Çalışan bir dev sunucusu varsa kapatıp 'npm ci' komutunu elle çalıştırın." >&2
    exit 0
  fi
  # npm ci runs the project's postinstall (prisma generate), so the client is already fresh.
  installed=1
fi

if [ -z "$installed" ] && printf '%s\n' "$changed" | grep -qx 'prisma/schema.prisma'; then
  echo "[sync-deps] Prisma şeması değişti: istemci üretiliyor..."
  npx prisma generate || echo "[sync-deps] prisma generate başarısız oldu; elle çalıştırın: npx prisma generate" >&2
fi

if printf '%s\n' "$changed" | grep -q '^prisma/migrations/'; then
  echo "[sync-deps] Not: yeni migration geldi. Yerel veritabanı kullanıyorsanız kendiniz uygulayın."
fi

exit 0
