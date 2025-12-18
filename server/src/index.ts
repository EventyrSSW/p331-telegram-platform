import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import gamesRouter from './routes/games'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/games', gamesRouter)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
