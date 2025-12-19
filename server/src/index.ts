import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import gamesRouter from './routes/games'
import usersRouter from './routes/users'

dotenv.config()

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

app.use('/api/games', gamesRouter)
app.use('/api/users', usersRouter)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
