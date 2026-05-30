import { signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '../firebase'

declare global {
  interface Window {
    Kakao: any
  }
}

const KAKAO_AUTH_URL = 'https://kauth.kakao.com/oauth/authorize'

export function initKakaoSdk() {
  if (window.Kakao && !window.Kakao.isInitialized()) {
    window.Kakao.init(import.meta.env.VITE_KAKAO_JS_KEY)
  }
}

export async function wakeUpServer(): Promise<void> {
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'
  try {
    // no-cors: CORS 없이 요청 가능, 서버 깨우기 목적
    await fetch(`${serverUrl}/health`, { mode: 'no-cors', signal: AbortSignal.timeout(35000) })
  } catch {
    // 응답 실패해도 진행
  }
}

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
