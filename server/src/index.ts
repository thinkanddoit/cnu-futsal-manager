import express from 'express'
import cors from 'cors'
import { kakaoAuthRouter } from './kakaoAuth'
import { tallyStatsRouter } from './tallyStats'

const app = express()
const PORT = process.env.PORT || 3001

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',')

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
}))
app.use(express.json())
app.use('/auth', kakaoAuthRouter)
app.use('/stats', tallyStatsRouter)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
