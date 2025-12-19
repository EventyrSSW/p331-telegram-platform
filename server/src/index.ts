import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import gamesRouter from './routes/games'
import usersRouter from './routes/users'
import { telegramAuthMiddleware } from './middleware/telegramAuth'

dotenv.config()

// Validate required environment variables
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('FATAL: TELEGRAM_BOT_TOKEN environment variable is required')
  process.exit(1)
}

const app = express()
const PORT = process.env.PORT || 3001

// CORS configuration for Telegram Mini App
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      callback(null, true)
      return
    }

    // Allowed origins
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://p331-tg-platform.vercel.app',
      'https://telegram-platform.eventyr.cloud',
    ]

    // Allow any Vercel preview deployments
    const isVercelPreview = origin.includes('.vercel.app')
    // Allow ngrok URLs
    const isNgrok = origin.includes('.ngrok')

    if (allowedOrigins.includes(origin) || isVercelPreview || isNgrok) {
      callback(null, true)
    } else {
      // REJECT unknown origins - this was the bug!
      console.warn('CORS blocked origin:', origin)
      callback(new Error('Not allowed by CORS'), false)
    }
  },
  credentials: true,
}

app.use(cors(corsOptions))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Games routes remain public
app.use('/api/games', gamesRouter)

// User routes are protected with Telegram authentication
app.use('/api/users', telegramAuthMiddleware, usersRouter)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
