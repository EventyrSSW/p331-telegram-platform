# Vercel & Telegram Mini App Deployment Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy the gaming platform frontend to Vercel and configure it as a Telegram Mini App for testing inside Telegram.

**Architecture:** Frontend deploys to Vercel as static SPA. Backend runs locally with ngrok tunnel for development/testing. Telegram Bot configured via BotFather to launch Mini App. Environment variables manage API URLs per environment.

**Tech Stack:** Vercel (hosting), ngrok (local tunnel), Telegram BotFather (Mini App config), Vite (build)

---

## Phase 1: Prepare for Vercel Deployment

### Task 1: Create Vercel Configuration

**Files:**
- Create: `vercel.json`

**Step 1: Create Vercel config for SPA routing**

Create `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This ensures:
- React Router works (all routes serve index.html)
- Vite build output is used

**Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: add Vercel configuration for SPA deployment"
```

---

### Task 2: Update Environment Variables Setup

**Files:**
- Modify: `src/services/api.ts`
- Create: `.env.production.example`

**Step 1: Update API service for production flexibility**

The API service already supports `VITE_API_URL` env variable. For local testing with Telegram, we'll use ngrok URL.

Create `.env.production.example`:
```
# For production with deployed backend:
# VITE_API_URL=https://your-backend.railway.app/api

# For testing with ngrok tunnel to local backend:
# VITE_API_URL=https://your-ngrok-url.ngrok-free.app/api
```

**Step 2: Commit**

```bash
git add .env.production.example
git commit -m "docs: add production environment example"
```

---

### Task 3: Update TON Connect Manifest for Production

**Files:**
- Modify: `public/tonconnect-manifest.json`
- Create: `src/config/constants.ts`

**Step 1: Create app constants**

Create `src/config/constants.ts`:
```typescript
export const APP_NAME = 'Gaming Platform'
export const APP_URL = import.meta.env.VITE_APP_URL || 'https://your-app.vercel.app'
```

**Step 2: Update TON Connect manifest**

Modify `public/tonconnect-manifest.json`:
```json
{
  "url": "https://your-app.vercel.app",
  "name": "Gaming Platform",
  "iconUrl": "https://your-app.vercel.app/icon-192.png"
}
```

Note: After Vercel deployment, update this with actual URL.

**Step 3: Commit**

```bash
git add src/config/constants.ts public/tonconnect-manifest.json
git commit -m "feat: add app constants and update TON Connect manifest"
```

---

### Task 4: Add App Icons for PWA/Telegram

**Files:**
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`
- Modify: `index.html`

**Step 1: Create placeholder icons**

For now, create simple placeholder icons. You can replace with actual branding later.

Use a simple purple square with "G" as placeholder (or use any 192x192 and 512x512 PNG).

**Step 2: Update index.html with meta tags**

Modify `index.html` to add:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#1A1A2E" />
    <meta name="description" content="Gaming Platform - Play games and earn coins" />
    <title>Gaming Platform</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Key additions:
- `maximum-scale=1.0, user-scalable=no` - Better for Telegram Mini Apps
- `theme-color` - Matches our dark theme
- `apple-touch-icon` - For iOS/Telegram

**Step 3: Commit**

```bash
git add public/icon-192.png public/icon-512.png index.html
git commit -m "feat: add app icons and meta tags for Telegram/PWA"
```

---

### Task 5: Fix Telegram SDK Initialization for Production

**Files:**
- Modify: `src/providers/TelegramProvider.tsx`

**Step 1: Update Telegram provider for better error handling**

The current implementation may fail silently. Update for better production behavior:

Modify `src/providers/TelegramProvider.tsx`:
```tsx
import { useEffect, useState, createContext, useContext, ReactNode } from 'react'

interface TelegramContextValue {
  isReady: boolean
  isTelegram: boolean
  colorScheme: 'dark' | 'light'
  webApp: typeof window.Telegram?.WebApp | null
}

const TelegramContext = createContext<TelegramContextValue>({
  isReady: false,
  isTelegram: false,
  colorScheme: 'dark',
  webApp: null,
})

export function useTelegram() {
  return useContext(TelegramContext)
}

interface TelegramProviderProps {
  children: ReactNode
}

export function TelegramProvider({ children }: TelegramProviderProps) {
  const [isReady, setIsReady] = useState(false)
  const [isTelegram, setIsTelegram] = useState(false)
  const [colorScheme, setColorScheme] = useState<'dark' | 'light'>('dark')
  const [webApp, setWebApp] = useState<typeof window.Telegram?.WebApp | null>(null)

  useEffect(() => {
    const initTelegram = () => {
      // Check if running inside Telegram
      const tg = window.Telegram?.WebApp

      if (tg) {
        // We're in Telegram
        tg.ready()
        tg.expand()

        setWebApp(tg)
        setIsTelegram(true)
        setColorScheme(tg.colorScheme || 'dark')

        // Listen for theme changes
        tg.onEvent('themeChanged', () => {
          setColorScheme(tg.colorScheme || 'dark')
        })
      } else {
        // Not in Telegram (browser testing)
        setIsTelegram(false)
      }

      setIsReady(true)
    }

    // Small delay to ensure Telegram script is loaded
    if (document.readyState === 'complete') {
      initTelegram()
    } else {
      window.addEventListener('load', initTelegram)
      return () => window.removeEventListener('load', initTelegram)
    }
  }, [])

  return (
    <TelegramContext.Provider value={{ isReady, isTelegram, colorScheme, webApp }}>
      {children}
    </TelegramContext.Provider>
  )
}

// Add Telegram types to window
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void
        expand: () => void
        close: () => void
        colorScheme: 'dark' | 'light'
        themeParams: Record<string, string>
        initDataUnsafe: {
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
          }
        }
        onEvent: (event: string, callback: () => void) => void
        offEvent: (event: string, callback: () => void) => void
        MainButton: {
          text: string
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
        }
        BackButton: {
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
        }
      }
    }
  }
}
```

**Step 2: Add Telegram Web App script to index.html**

Modify `index.html` to add before closing `</head>`:
```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
```

**Step 3: Commit**

```bash
git add src/providers/TelegramProvider.tsx index.html
git commit -m "feat: improve Telegram SDK initialization for production"
```

---

## Phase 2: Deploy to Vercel

### Task 6: Deploy Frontend to Vercel

**Step 1: Push code to GitHub (if not already)**

```bash
git push origin main
```

**Step 2: Deploy via Vercel CLI or Dashboard**

Option A - Vercel CLI:
```bash
npm i -g vercel
vercel login
vercel --prod
```

Option B - Vercel Dashboard:
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Vercel auto-detects Vite, uses vercel.json config
4. Click Deploy

**Step 3: Note your deployment URL**

After deployment, you'll get a URL like:
- `https://p331-telegram-platform.vercel.app`
- Or custom domain if configured

**Step 4: Update TON Connect manifest with real URL**

Modify `public/tonconnect-manifest.json` with actual Vercel URL:
```json
{
  "url": "https://p331-telegram-platform.vercel.app",
  "name": "Gaming Platform",
  "iconUrl": "https://p331-telegram-platform.vercel.app/icon-192.png"
}
```

**Step 5: Redeploy**

```bash
git add public/tonconnect-manifest.json
git commit -m "fix: update TON Connect manifest with production URL"
git push origin main
```

Vercel will auto-redeploy.

---

## Phase 3: Set Up ngrok for Local Backend

### Task 7: Install and Configure ngrok

**Step 1: Install ngrok**

```bash
# macOS with Homebrew
brew install ngrok

# Or download from https://ngrok.com/download
```

**Step 2: Sign up and authenticate**

1. Create free account at https://ngrok.com
2. Get your authtoken from dashboard
3. Run:
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

**Step 3: Create ngrok config for consistent URL (optional)**

For free tier, URL changes each time. For consistent URL, upgrade to paid or use:
```bash
ngrok http 3001 --domain=your-domain.ngrok-free.app
```

---

### Task 8: Create Development Script with ngrok

**Files:**
- Create: `scripts/dev-telegram.sh`
- Modify: `package.json`

**Step 1: Create development script**

Create `scripts/dev-telegram.sh`:
```bash
#!/bin/bash

echo "Starting Telegram development environment..."
echo ""

# Start backend in background
echo "Starting backend server on port 3001..."
cd server && npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start ngrok in background
echo "Starting ngrok tunnel..."
ngrok http 3001 --log=stdout > /tmp/ngrok.log &
NGROK_PID=$!

# Wait for ngrok to start
sleep 3

# Get ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | cut -d'"' -f4)

echo ""
echo "============================================"
echo "Telegram Development Environment Ready!"
echo "============================================"
echo ""
echo "ngrok URL: $NGROK_URL"
echo ""
echo "Set this in Vercel environment variables:"
echo "VITE_API_URL=$NGROK_URL/api"
echo ""
echo "Or for local testing, update .env.local:"
echo "VITE_API_URL=$NGROK_URL/api"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for Ctrl+C
trap "kill $BACKEND_PID $NGROK_PID 2>/dev/null; exit" INT
wait
```

**Step 2: Make script executable**

```bash
chmod +x scripts/dev-telegram.sh
```

**Step 3: Add npm script**

Add to `package.json` scripts:
```json
"dev:telegram": "bash scripts/dev-telegram.sh"
```

**Step 4: Commit**

```bash
git add scripts/dev-telegram.sh package.json
git commit -m "feat: add Telegram development script with ngrok"
```

---

## Phase 4: Configure Telegram Bot

### Task 9: Configure Mini App in BotFather

**Step 1: Open @BotFather in Telegram**

Send `/mybots` to see your bots.

**Step 2: Select your bot and configure Mini App**

1. Select your bot
2. Click "Bot Settings"
3. Click "Menu Button" → "Configure menu button"
4. Enter your Vercel URL: `https://p331-telegram-platform.vercel.app`
5. Enter button text: "Play Games"

**Step 3: Alternative - Set Web App URL directly**

Send to BotFather:
```
/setmenubutton
```
Select your bot, then enter:
- URL: `https://p331-telegram-platform.vercel.app`
- Button text: `Play Games`

**Step 4: Test in Telegram**

1. Open your bot in Telegram
2. You should see "Play Games" button at bottom
3. Click it to open your Mini App

---

### Task 10: Add Inline Button for Mini App (Optional)

**Files:**
- Create: `bot/index.js` (simple bot for testing)

**Step 1: Create simple test bot**

Create `bot/index.js`:
```javascript
// Simple bot to test Mini App launch
// Run with: node bot/index.js

const TelegramBot = require('node-telegram-bot-api')

const token = process.env.TELEGRAM_BOT_TOKEN
const webAppUrl = process.env.WEB_APP_URL || 'https://p331-telegram-platform.vercel.app'

const bot = new TelegramBot(token, { polling: true })

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id

  bot.sendMessage(chatId, 'Welcome to Gaming Platform! 🎮', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🎮 Play Games',
            web_app: { url: webAppUrl }
          }
        ],
        [
          {
            text: '⚙️ Settings',
            web_app: { url: `${webAppUrl}/settings` }
          }
        ]
      ]
    }
  })
})

bot.onText(/\/games/, (msg) => {
  const chatId = msg.chat.id

  bot.sendMessage(chatId, 'Choose a game:', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🎲 Open Gaming Platform',
            web_app: { url: webAppUrl }
          }
        ]
      ]
    }
  })
})

console.log('Bot is running...')
```

**Step 2: Install bot dependency**

```bash
npm install node-telegram-bot-api
```

**Step 3: Create bot start script**

Add to `package.json`:
```json
"bot": "TELEGRAM_BOT_TOKEN=your_token node bot/index.js"
```

**Step 4: Commit**

```bash
git add bot/index.js package.json package-lock.json
git commit -m "feat: add Telegram bot for Mini App testing"
```

---

## Phase 5: Environment Configuration for Vercel

### Task 11: Configure Vercel Environment Variables

**Step 1: Go to Vercel Dashboard**

1. Open your project in Vercel
2. Go to Settings → Environment Variables

**Step 2: Add environment variables**

For testing with local backend via ngrok:
```
VITE_API_URL = https://your-ngrok-url.ngrok-free.app/api
VITE_APP_URL = https://p331-telegram-platform.vercel.app
```

**Step 3: Redeploy to apply**

Click "Redeploy" in Vercel or push a new commit.

---

### Task 12: Update CORS for ngrok

**Files:**
- Modify: `server/src/index.ts`

**Step 1: Update CORS config for ngrok and Vercel**

Modify `server/src/index.ts`:
```typescript
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import gamesRouter from './routes/games'
import usersRouter from './routes/users'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// CORS configuration for Telegram Mini App
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://p331-telegram-platform.vercel.app',
  // Add your Vercel URLs
]

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)

    // Allow any Vercel preview URL
    if (origin.includes('.vercel.app')) return callback(null, true)

    // Allow ngrok URLs
    if (origin.includes('ngrok')) return callback(null, true)

    // Check allowed list
    if (allowedOrigins.includes(origin)) return callback(null, true)

    callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))

app.use(express.json())

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/games', gamesRouter)
app.use('/api/users', usersRouter)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

**Step 2: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: update CORS for Vercel and ngrok origins"
```

---

## Testing Checklist

### Task 13: Final Testing

**Step 1: Start local development with ngrok**

```bash
npm run dev:telegram
```

Note the ngrok URL.

**Step 2: Update Vercel environment**

Set `VITE_API_URL` to your ngrok URL in Vercel dashboard.
Redeploy.

**Step 3: Test in browser**

Open `https://p331-telegram-platform.vercel.app`
- [ ] Page loads with dark theme
- [ ] Games load from API (via ngrok)
- [ ] Navigation works
- [ ] TON Connect button works

**Step 4: Test in Telegram**

1. Open your bot in Telegram
2. Click the Menu button or send /start
3. Click "Play Games" button

- [ ] Mini App opens in Telegram
- [ ] Dark theme matches Telegram
- [ ] Games display correctly
- [ ] Can navigate to Settings
- [ ] TON Connect wallet modal opens

**Step 5: Verify Telegram user data (optional)**

Add to any component to debug:
```typescript
const { webApp } = useTelegram()
console.log('Telegram user:', webApp?.initDataUnsafe?.user)
```

---

## Summary

After completing this plan:

1. **Frontend** deployed to Vercel at `https://your-app.vercel.app`
2. **Backend** runs locally, exposed via ngrok
3. **Telegram Bot** configured with Mini App menu button
4. **Testing** works both in browser and inside Telegram

**Next steps for production:**
- Deploy backend to Railway/Render/Vercel Serverless
- Set up proper database (PostgreSQL/MongoDB)
- Implement real TON payment handling
- Add Telegram user authentication
