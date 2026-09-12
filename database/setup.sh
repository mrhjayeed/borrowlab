#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Load database configuration from server/.env if available
if [ -f "$DIR/../server/.env" ]; then
    set -a
    source "$DIR/../server/.env" 2>/dev/null || true
    set +a
fi

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGPASSWORD="${PGPASSWORD:-postgres}"
DBNAME="${PGDATABASE:-borrowlab}"

export PGPASSWORD

echo "==> Checking if database '${DBNAME}' exists on ${PGHOST}:${PGPORT}..."
if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -lqt | cut -d \| -f 1 | grep -qw "$DBNAME"; then
    echo "Database '${DBNAME}' exists. Recreating clean database..."
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c "DROP DATABASE ${DBNAME} WITH (FORCE);"
fi

echo "==> Creating database '${DBNAME}'..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c "CREATE DATABASE ${DBNAME};"

echo "==> Applying 01_schema.sql..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$DBNAME" -f "$DIR/01_schema.sql"

echo "==> Applying 02_views.sql..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$DBNAME" -f "$DIR/02_views.sql"

echo "==> Applying 03_indexes.sql..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$DBNAME" -f "$DIR/03_indexes.sql"

echo "==> Applying 04_seed.sql..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$DBNAME" -f "$DIR/04_seed.sql"

echo "==> Database '${DBNAME}' successfully provisioned and seeded!"
