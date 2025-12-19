#!/bin/bash

# Deployment script for p331-telegram-platform backend
# Run this on your Hetzner server to deploy/update the backend

set -e  # Exit on any error

# Configuration
REPO_URL="https://github.com/EventyrSSW/p331-telegram-platform.git"
APP_NAME="p331-backend"
APP_DIR="/opt/p331-telegram-platform"
PORT=5331  # Static port (relates to project name p331)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    log_warn "Consider running with sudo for directory permissions"
fi

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."

    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm first."
        exit 1
    fi

    if ! command -v pm2 &> /dev/null; then
        log_warn "pm2 is not installed. Installing globally..."
        npm install -g pm2
    fi

    if ! command -v git &> /dev/null; then
        log_error "git is not installed. Please install git first."
        exit 1
    fi

    log_info "All dependencies are available."
}

# Clone or update repository
update_repo() {
    log_info "Updating repository..."

    if [ -d "$APP_DIR" ]; then
        log_info "Repository exists. Pulling latest changes..."
        cd "$APP_DIR"
        git fetch origin
        git reset --hard origin/main
        git pull origin main
    else
        log_info "Cloning repository..."
        mkdir -p "$(dirname "$APP_DIR")"
        git clone "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
    fi

    log_info "Repository updated successfully."
}

# Install dependencies and build
build_server() {
    log_info "Installing dependencies..."
    cd "$APP_DIR/server"
    npm install

    log_info "Generating Prisma client..."
    npx prisma generate

    log_info "Building server..."
    npm run build

    log_info "Server built successfully."
}

# Create/update environment file
setup_env() {
    log_info "Setting up environment..."

    ENV_FILE="$APP_DIR/server/.env"

    if [ ! -f "$ENV_FILE" ]; then
        log_info "Creating .env file..."
        cat > "$ENV_FILE" << EOF
PORT=$PORT
NODE_ENV=production
DATABASE_URL=postgresql://postgres:iO6nR0rJ0cW7zS5b@db.hgeuwhnvwpkslzazabcd.supabase.co:5432/postgres
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here
JWT_SECRET=$(openssl rand -base64 32)
EOF
        log_warn "============================================"
        log_warn "IMPORTANT: Update TELEGRAM_BOT_TOKEN in:"
        log_warn "$ENV_FILE"
        log_warn "============================================"
        log_info ".env file created with default values."
    else
        log_info ".env file exists, checking for missing variables..."

        # Add missing variables
        if ! grep -q "^PORT=" "$ENV_FILE"; then
            echo "PORT=$PORT" >> "$ENV_FILE"
            log_info "Added PORT to .env"
        fi

        if ! grep -q "^NODE_ENV=" "$ENV_FILE"; then
            echo "NODE_ENV=production" >> "$ENV_FILE"
            log_info "Added NODE_ENV to .env"
        fi

        if ! grep -q "^DATABASE_URL=" "$ENV_FILE"; then
            echo "DATABASE_URL=postgresql://postgres:iO6nR0rJ0cW7zS5b@db.hgeuwhnvwpkslzazabcd.supabase.co:5432/postgres" >> "$ENV_FILE"
            log_info "Added DATABASE_URL to .env"
        fi

        if ! grep -q "^JWT_SECRET=" "$ENV_FILE"; then
            echo "JWT_SECRET=$(openssl rand -base64 32)" >> "$ENV_FILE"
            log_info "Added JWT_SECRET to .env"
        fi

        if ! grep -q "^TELEGRAM_BOT_TOKEN=" "$ENV_FILE"; then
            echo "TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here" >> "$ENV_FILE"
            log_warn "Added TELEGRAM_BOT_TOKEN placeholder - UPDATE IT!"
        fi
    fi

    # Verify all required vars are present and not placeholder
    log_info "Verifying environment variables..."

    if grep -q "your-telegram-bot-token-here" "$ENV_FILE"; then
        log_warn "============================================"
        log_warn "TELEGRAM_BOT_TOKEN is still a placeholder!"
        log_warn "Edit $ENV_FILE and set a real token."
        log_warn "============================================"
    fi

    log_info "Environment setup complete."
}

# Start/restart with PM2
start_pm2() {
    log_info "Starting application with PM2..."

    cd "$APP_DIR/server"

    # Stop existing instance if running
    pm2 delete "$APP_NAME" 2>/dev/null || true

    # Start with PM2 using ecosystem file
    pm2 start ecosystem.config.js --env production

    # Save PM2 process list (for auto-restart on reboot)
    pm2 save

    # Wait a moment and check if it's running
    sleep 2
    if pm2 list | grep -q "$APP_NAME"; then
        log_info "Application started successfully!"
    else
        log_error "Application may have failed to start. Check logs:"
        log_error "pm2 logs $APP_NAME"
    fi
}

# Show status
show_status() {
    echo ""
    log_info "=========================================="
    log_info "Deployment completed!"
    log_info "=========================================="
    echo ""
    log_info "Application: $APP_NAME"
    log_info "Directory:   $APP_DIR"
    log_info "Port:        $PORT"
    echo ""
    log_info "API endpoint: http://localhost:$PORT/api/health"
    echo ""
    log_info "PM2 Commands:"
    echo "  pm2 status          - View running processes"
    echo "  pm2 logs $APP_NAME  - View application logs"
    echo "  pm2 restart $APP_NAME - Restart application"
    echo "  pm2 stop $APP_NAME  - Stop application"
    echo ""

    # Show PM2 status
    pm2 status
}

# Main execution
main() {
    log_info "Starting deployment of p331-telegram-platform backend..."
    echo ""

    check_dependencies
    update_repo
    build_server
    setup_env
    start_pm2
    show_status
}

# Run main function
main
