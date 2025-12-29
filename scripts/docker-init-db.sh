#!/bin/bash
# Create additional databases for local development

set -e

# Create nakama database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE nakama OWNER $POSTGRES_USER'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'nakama')\gexec
EOSQL

echo "Database 'nakama' created (or already exists)"
