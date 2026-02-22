#!/bin/sh
set -e

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until pg_isready -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -U "${DB_USER:-user}" -q; do
  sleep 1
done
echo "PostgreSQL is ready."

# Run SQL migrations if requested
if [ "$RUN_MIGRATIONS" = "true" ] && [ -d "/app/migrations/postgresql" ]; then
  echo "Running database migrations..."
  for migration in /app/migrations/postgresql/*.sql; do
    echo "  Applying $(basename "$migration")..."
    PGPASSWORD="${DB_PASSWORD:-password}" psql \
      -h "${DB_HOST:-db}" \
      -p "${DB_PORT:-5432}" \
      -U "${DB_USER:-user}" \
      -d "${DB_NAME:-badminton}" \
      -f "$migration" \
      --no-psqlrc \
      -q 2>&1 || true
  done
  echo "Migrations done."
fi

exec "$@"
