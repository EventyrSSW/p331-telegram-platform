#!/bin/bash
cd "$(dirname "$0")"

# Load .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep -v '^\s*$' | xargs)
fi

# Start the server
exec node dist/index.js
