import { Router } from 'express'
import * as admin from 'firebase-admin'
import * as bcrypt from 'bcryptjs'
import { createMemberUser } from './createUser'

// Initialize Firebase Admin once
if (!admin.apps.length) {
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
  if (serviceAccountBase64) {
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString())
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  } else {
    admin.initializeApp()
  }
}

const router = Router()

// POST /auth/login — { name, password } → custom token
router.post('/login', async (req, res) => {
  const { name, password } = req.body as { name?: string; password?: string }

  if (!name || !password) {
    res.status(400).json({ error: 'name and password are required' })
    return
  }

  try {
    const db = admin.firestore()

    // Find user by name (member or admin role)
    const snap = await db
      .collection('users')
      .where('name', '==', name)
      .where('role', 'in', ['member', 'admin'])
      .limit(1)
      .get()

    if (snap.empty) {
      res.status(401).json({ error: 'user_not_found' })
      return
    }

    const uid = snap.docs[0].id

    // Get hashed password
    const credDoc = await db.collection('userCredentials').doc(uid).get()
    if (!credDoc.exists) {
      res.status(401).json({ error: 'invalid_credentials' })
      return
    }

    const { passwordHash } = credDoc.data() as { passwordHash: string }
    const valid = await bcrypt.compare(password, passwordHash)
    if (!valid) {
      res.status(401).json({ error: 'invalid_credentials' })
      return
    }

    const customToken = await admin.auth().createCustomToken(uid)
    res.json({ customToken })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /auth/change-password — requires Firebase ID token
router.post('/change-password', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing_token' })
    return
  }
  const idToken = authHeader.slice(7)

  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string
    newPassword?: string
  }

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword and newPassword are required' })
    return
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken)
    const uid = decoded.uid
    const db = admin.firestore()

    const credDoc = await db.collection('userCredentials').doc(uid).get()
    if (!credDoc.exists) {
      res.status(401).json({ error: 'invalid_credentials' })
      return
    }

    const { passwordHash } = credDoc.data() as { passwordHash: string }
    const valid = await bcrypt.compare(currentPassword, passwordHash)
    if (!valid) {
      res.status(401).json({ error: 'invalid_credentials' })
      return
    }

    const newHash = await bcrypt.hash(newPassword, 10)
    await db.collection('userCredentials').doc(uid).update({ passwordHash: newHash })

    res.json({ ok: true })
  } catch (err) {
    console.error('Change password error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /auth/reset-password — admin only, resets target uid's password to 1234
router.post('/reset-password', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing_token' })
    return
  }
  const idToken = authHeader.slice(7)

  const { uid: targetUid } = req.body as { uid?: string }
  if (!targetUid) {
    res.status(400).json({ error: 'uid is required' })
    return
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken)
    const db = admin.firestore()

    // Check caller is admin
    const callerDoc = await db.collection('users').doc(decoded.uid).get()
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      res.status(403).json({ error: 'forbidden' })
      return
    }

    const passwordHash = await bcrypt.hash('1234', 10)
    await db.collection('userCredentials').doc(targetUid).set({ passwordHash })

    res.json({ ok: true })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as passwordAuthRouter }
