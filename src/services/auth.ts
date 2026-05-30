import { signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '../firebase'

export async function wakeUpServer(): Promise<void> {
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'
  try {
    // no-cors: CORS 없이 요청 가능, 서버 깨우기 목적
    await fetch(`${serverUrl}/health`, { mode: 'no-cors', signal: AbortSignal.timeout(35000) })
  } catch {
    // 응답 실패해도 진행
  }
}

export async function loginWithNamePassword(name: string, password: string): Promise<void> {
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'
  const res = await fetch(`${serverUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password }),
  })
  if (res.status === 401) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'invalid_credentials')
  }
  if (!res.ok) throw new Error('Login failed')
  const { customToken } = (await res.json()) as { customToken: string }
  await signInWithCustomToken(auth, customToken)
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'
  const idToken = await auth.currentUser?.getIdToken()
  if (!idToken) throw new Error('not_authenticated')

  const res = await fetch(`${serverUrl}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  if (res.status === 401) throw new Error('invalid_credentials')
  if (!res.ok) throw new Error('Change password failed')
}

export async function resetMemberPassword(uid: string): Promise<void> {
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'
  const idToken = await auth.currentUser?.getIdToken()
  if (!idToken) throw new Error('not_authenticated')

  const res = await fetch(`${serverUrl}/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ uid }),
  })
  if (res.status === 403) throw new Error('forbidden')
  if (!res.ok) throw new Error('Reset password failed')
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}
