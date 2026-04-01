#!/bin/sh
set -eu

cd /app/apps/api

DB_FILE_PATH=""
case "${DATABASE_URL:-}" in
  file:*)
    DB_FILE_PATH="${DATABASE_URL#file:}"
    ;;
esac

DB_ALREADY_EXISTS=false
if [ -n "${DB_FILE_PATH}" ] && [ -f "${DB_FILE_PATH}" ]; then
  DB_ALREADY_EXISTS=true
fi

if [ "${API_SKIP_DB_PUSH:-false}" != "true" ]; then
  npx prisma db push --schema prisma/schema.prisma
fi

SHOULD_SEED=false
if [ "${API_FORCE_SEED_DEMO_DATA:-false}" = "true" ]; then
  SHOULD_SEED=true
elif [ "${API_AUTO_SEED_DEMO_DATA:-false}" = "true" ] && [ "${DB_ALREADY_EXISTS}" = "false" ]; then
  SHOULD_SEED=true
fi

if [ "${SHOULD_SEED}" = "true" ]; then
  node prisma/seed.js
fi

exec node dist/api/src/main.js
