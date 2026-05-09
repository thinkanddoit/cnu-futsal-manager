import { signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { auth, functions } from '../firebase'

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
  const kakaoLogin = httpsCallable<{ code: string; redirectUri: string }, { customToken: string }>(
    functions,
    'kakaoLogin'
  )
  const result = await kakaoLogin({
    code,
    redirectUri: import.meta.env.VITE_KAKAO_REDIRECT_URI,
  })
  await signInWithCustomToken(auth, result.data.customToken)
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}
