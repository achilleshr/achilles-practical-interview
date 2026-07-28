#!/usr/bin/env bash
# Runs once, right after the container is created.
set -euo pipefail

# Make sure Postgres is up and the "postgres" host alias exists. (postStart has
# not run yet at create time, so we invoke it explicitly here.)
bash .devcontainer/post-start.sh

# Give the postgres superuser a known password so the app can connect over TCP
# with the credentials baked into DATABASE_URL (postgres:postgres).
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER USER postgres WITH PASSWORD 'postgres';"

# Install dependencies and generate the Prisma client.
pnpm install
pnpm prisma generate

# Load the schema + sample data from the SQL dump (uses DATABASE_URL from .env).
./scripts/seed_db

echo ""
echo "Dev container ready. Start the app with:  pnpm start"
echo "  API:     http://localhost:8080/v1"
echo "  Swagger: http://localhost:8080/api"
