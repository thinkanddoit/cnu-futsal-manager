import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import fetch from 'node-fetch'

interface KakaoTokenResponse {
  access_token: string
  token_type: string
  refresh_token?: string
  expires_in: number
  scope?: string
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

export const kakaoLogin = onCall(
  { region: 'asia-northeast3' },
  async (request) => {
    const { code, redirectUri } = request.data as { code: string; redirectUri: string }

    if (!code || !redirectUri) {
      throw new HttpsError('invalid-argument', 'code and redirectUri are required')
    }

    // 1. Kakao code → access token
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_REST_API_KEY!,
        redirect_uri: redirectUri,
        code,
      }).toString(),
    })
    const tokenData = (await tokenRes.json()) as KakaoTokenResponse
    if (!tokenData.access_token) {
      throw new HttpsError('unauthenticated', 'Failed to get Kakao access token')
    }

    // 2. access token → user info
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userData = (await userRes.json()) as KakaoUserInfo

    const kakaoId = String(userData.id)
    const name = userData.kakao_account?.profile?.nickname ?? '멤버'
    const profileImage = userData.kakao_account?.profile?.profile_image_url ?? ''

    // 3. Firestore에 사용자 생성 또는 확인
    const db = admin.firestore()
    const usersRef = db.collection('users')
    const existing = await usersRef.where('kakaoId', '==', kakaoId).limit(1).get()

    let uid: string
    if (existing.empty) {
      const newUserRef = usersRef.doc()
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
    return { customToken }
  }
)
