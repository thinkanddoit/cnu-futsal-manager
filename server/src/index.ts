import express from 'express'
import cors from 'cors'
import * as admin from 'firebase-admin'
import { passwordAuthRouter } from './passwordAuth'
import { tallyStatsRouter } from './tallyStats'
import { createMemberUser } from './createUser'

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
app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/auth', passwordAuthRouter)
app.use('/stats', tallyStatsRouter)

// POST /users/create — admin only, creates a new member with PIN 1234
app.post('/users/create', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing_token' })
    return
  }
  const idToken = authHeader.slice(7)

  const { name } = req.body as { name?: string }
  if (!name?.trim()) {
    res.status(400).json({ error: 'name is required' })
    return
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken)
    const db = admin.firestore()

    const callerDoc = await db.collection('users').doc(decoded.uid).get()
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      res.status(403).json({ error: 'forbidden' })
      return
    }

    const uid = await createMemberUser(name.trim())
    res.json({ uid })
  } catch (err: any) {
    if (err?.message === 'duplicate_name') {
      res.status(409).json({ error: 'duplicate_name' })
      return
    }
    console.error('Create user error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
