#!/bin/sh
set -e

echo "[entrypoint] Running database migrations (prisma migrate deploy)..."
if npx prisma migrate deploy; then
  echo "[entrypoint] Migrations applied"
else
  echo "[entrypoint] migrate deploy failed or no migrations found; running prisma db push"
  npx prisma db push
fi

echo "[entrypoint] Running seed script..."
node prisma/seed.js || echo "[entrypoint] Seed script exited with non-zero code (may already exist)"

echo "[entrypoint] Starting server"
exec node src/server.js
