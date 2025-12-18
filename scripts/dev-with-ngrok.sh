#!/bin/bash

# Start backend server and ngrok tunnel for Telegram Mini App development
# This allows the Vercel-deployed frontend to connect to your local backend

set -e

# Get absolute paths at script start
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKEND_PORT=${BACKEND_PORT:-3001}
NGROK_LOG="$PROJECT_DIR/.ngrok.log"

echo "🚀 Starting development environment with ngrok..."

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed. Install with: brew install ngrok"
    exit 1
fi

# Check if ngrok is authenticated
if ! ngrok config check &> /dev/null 2>&1; then
    echo "⚠️  ngrok may not be authenticated. Run 'ngrok config add-authtoken <YOUR_TOKEN>'"
    echo "   Get your token at: https://dashboard.ngrok.com/get-started/your-authtoken"
fi

# Kill any existing ngrok processes
pkill -f "ngrok http" 2>/dev/null || true

# Start backend server in background
echo "📦 Starting backend server on port $BACKEND_PORT..."
cd "$PROJECT_DIR/server"
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start ngrok tunnel
echo "🌐 Starting ngrok tunnel..."
cd "$PROJECT_DIR"
ngrok http $BACKEND_PORT --log=stdout > "$NGROK_LOG" 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start
sleep 3

# Extract ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | sed 's/"public_url":"//')

if [ -z "$NGROK_URL" ]; then
    echo "❌ Failed to get ngrok URL. Check if ngrok is running."
    echo "   You may need to authenticate: ngrok config add-authtoken <YOUR_TOKEN>"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "📋 Configuration:"
echo "   Backend (local):  http://localhost:$BACKEND_PORT"
echo "   Backend (public): $NGROK_URL"
echo "   Frontend:         https://p331-tg-platform.vercel.app"
echo ""
echo "📝 Next steps:"
echo "   1. Update Vercel environment variable:"
echo "      VITE_API_URL=$NGROK_URL"
echo ""
echo "   2. Or update .env.production locally and redeploy"
echo ""
echo "Press Ctrl+C to stop all services..."

# Cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $NGROK_PID 2>/dev/null || true
    pkill -f "ngrok http" 2>/dev/null || true
    rm -f "$NGROK_LOG"
    echo "👋 Goodbye!"
}

trap cleanup EXIT

# Wait for processes
wait
