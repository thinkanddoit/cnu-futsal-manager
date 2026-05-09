import { signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '../firebase'

const KAKAO_AUTH_URL = 'https://kauth.kakao.com/oauth/authorize'

export function redirectToKakaoLogin() {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_KAKAO_REST_API_KEY,
    redirect_uri: import.meta.env.VITE_KAKAO_REDIRECT_URI,
    response_type: 'code',
  })
  window.location.href = `${KAKAO_AUTH_URL}?${params}`
}

export async function loginWithKakaoCode(code: string): Promise<void> {
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'
  const res = await fetch(`${serverUrl}/auth/kakao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri: import.meta.env.VITE_KAKAO_REDIRECT_URI }),
  })
  if (!res.ok) throw new Error('Login failed')
  const { customToken } = await res.json() as { customToken: string }
  await signInWithCustomToken(auth, customToken)
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}
