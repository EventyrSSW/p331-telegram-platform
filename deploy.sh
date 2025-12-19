#!/bin/bash
set -e

APP_DIR="/opt/p331-telegram-platform"
APP_NAME="p331-backend"

echo "=== Deploying p331-telegram-platform ==="

# Update code
cd "$APP_DIR"
git fetch origin
git reset --hard origin/main

# Setup .env if missing
if [ ! -f "$APP_DIR/server/.env" ]; then
    echo "Creating .env file..."
    cat > "$APP_DIR/server/.env" << 'EOF'
PORT=5331
NODE_ENV=production
DATABASE_URL=postgresql://postgres:iO6nR0rJ0cW7zS5b@db.hgeuwhnvwpkslzazabcd.supabase.co:5432/postgres
TELEGRAM_BOT_TOKEN=your-token-here
JWT_SECRET=change-this-to-random-string
EOF
    echo "WARNING: Update TELEGRAM_BOT_TOKEN and JWT_SECRET in $APP_DIR/server/.env"
fi

# Build
cd "$APP_DIR/server"

# Install ALL dependencies including devDependencies for build
npm install --include=dev
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run build

# Make start script executable
chmod +x start.sh

# Restart PM2 (kill completely to clear any cached env)
pm2 kill 2>/dev/null || true
rm -f ~/.pm2/dump.pm2* 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "=== Done! ==="
pm2 status
