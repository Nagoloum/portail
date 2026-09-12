#!/bin/sh
set -e

echo "[entrypoint] running database migrations..."
node_modules/.bin/typeorm migration:run -d dist/database/data-source.js

echo "[entrypoint] seeding demo data (idempotent)..."
node dist/database/seeds/seed.js

echo "[entrypoint] starting server..."
exec node dist/main.js
