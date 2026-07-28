#!/usr/bin/env bash
# Runs on every container start. Keep it idempotent and fast.
set -euo pipefail

# The app's DATABASE_URL uses the host name "postgres" (a leftover from the old
# docker-compose layout). In this single-container setup Postgres runs on
# localhost, so we alias "postgres" -> 127.0.0.1. Docker regenerates /etc/hosts
# on every start, which is why this lives here rather than in post-create.
if ! grep -qE '^127\.0\.0\.1[[:space:]].*\bpostgres\b' /etc/hosts; then
  echo '127.0.0.1 postgres' | sudo tee -a /etc/hosts >/dev/null
fi

# Start the PostgreSQL 16 cluster if it isn't already accepting connections.
if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
  sudo pg_ctlcluster 16 main start
fi

# Wait (up to ~30s) until Postgres is ready.
for _ in $(seq 1 30); do
  if pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    echo "PostgreSQL is ready."
    exit 0
  fi
  sleep 1
done

echo "PostgreSQL did not become ready in time." >&2
exit 1
