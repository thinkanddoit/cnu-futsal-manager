import { Router } from 'express'
import * as admin from 'firebase-admin'
import fetch from 'node-fetch'

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY
if (!KAKAO_REST_API_KEY) {
  throw new Error('KAKAO_REST_API_KEY environment variable is required')
}
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET

const router = Router()

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

interface KakaoTokenResponse {
  access_token?: string
  token_type?: string
  error?: string
}

interface KakaoUserInfo {
  id: number
  kakao_account?: {
    profile?: {
      nickname?: string
      profile_image_url?: string
    }
  }
}

router.post('/kakao', async (req, res) => {
  const { code, redirectUri } = req.body as { code?: string; redirectUri?: string }

  if (!code || !redirectUri) {
    res.status(400).json({ error: 'code and redirectUri are required' })
    return
  }

  try {
    // 1. Kakao code → access token
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KAKAO_REST_API_KEY,
        redirect_uri: redirectUri,
        code,
        ...(KAKAO_CLIENT_SECRET && { client_secret: KAKAO_CLIENT_SECRET }),
      }).toString(),
    })
    const tokenData = (await tokenRes.json()) as KakaoTokenResponse
    if (!tokenData.access_token) {
      console.error('Kakao token error:', JSON.stringify(tokenData))
      res.status(401).json({ error: 'Failed to get Kakao access token', detail: tokenData })
      return
    }

    // 2. access token → user info
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    if (!userRes.ok) {
      res.status(401).json({ error: 'Failed to get Kakao user info' })
      return
    }
    const userData = (await userRes.json()) as KakaoUserInfo

    const kakaoId = String(userData.id)
    const name = userData.kakao_account?.profile?.nickname ?? '멤버'
    const profileImage = userData.kakao_account?.profile?.profile_image_url ?? ''

    // 3. Firestore: 사용자 생성 또는 확인
    const db = admin.firestore()
    const existing = await db.collection('users').where('kakaoId', '==', kakaoId).limit(1).get()

    let uid: string
    if (existing.empty) {
      const newUserRef = db.collection('users').doc()
      await newUserRef.set({
        name,
        kakaoId,
        profileImage,
        role: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      uid = newUserRef.id
    } else {
      uid = existing.docs[0].id
    }

    // 4. Firebase Custom Token 발급
    const customToken = await admin.auth().createCustomToken(uid)
    res.json({ customToken })
  } catch (err) {
    console.error('Kakao auth error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as kakaoAuthRouter }
