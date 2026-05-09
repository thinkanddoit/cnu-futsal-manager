# 풋살 동호회 관리 앱 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 풋살 동호회 운영을 위한 반응형 웹앱 — 카카오 로그인 + 운영진 승인, 경기 관리, 참석 신청, MVP 투표, 점수 랭킹

**Architecture:** React 19 + TypeScript SPA (Vite), Firebase (Firestore + Auth + Hosting + Cloud Functions). 카카오 OAuth → Cloud Function → Firebase Custom Token 연동. 공개 조회 / 회원 신청·투표 / 관리자 관리 3단계 권한.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, Firebase 11.x, Vitest, React Testing Library

---

## 코드 작성 전 사전 준비 (수동)

1. [Firebase 콘솔](https://console.firebase.google.com)에서 새 프로젝트 생성
2. Firestore Database 활성화 (테스트 모드로 시작)
3. Firebase Authentication 활성화 (Sign-in method는 설정하지 않아도 됨 — Custom Token 사용)
4. Firebase 프로젝트를 **Blaze (종량제) 플랜**으로 업그레이드 — Cloud Functions에서 Kakao 외부 API 호출에 필요 (소규모 사용 시 실제 요금 없음)
5. [Kakao Developers](https://developers.kakao.com)에서 앱 생성 → REST API 키 발급, 리다이렉트 URI 등록
6. Firebase CLI 설치: `npm install -g firebase-tools` → `firebase login`
7. `firebase init` 실행 (Firestore, Functions, Hosting 선택, 프로젝트 연결)

---

## 파일 구조

```
/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router.tsx
│   ├── firebase.ts
│   ├── types/
│   │   └── index.ts
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── hooks/
│   │   └── useAuth.ts
│   ├── services/
│   │   ├── auth.ts
│   │   ├── matches.ts
│   │   ├── attendances.ts
│   │   ├── votes.ts
│   │   └── users.ts
│   ├── utils/
│   │   └── mvpTally.ts
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── SchedulePage.tsx
│   │   ├── RankingsPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── PendingPage.tsx
│   │   ├── MatchDetailPage.tsx
│   │   ├── MyPage.tsx
│   │   └── admin/
│   │       ├── AdminHomePage.tsx
│   │       ├── AdminMatchesPage.tsx
│   │       └── AdminMembersPage.tsx
│   └── components/
│       ├── layout/
│       │   ├── Header.tsx
│       │   └── Layout.tsx
│       └── auth/
│           └── ProtectedRoute.tsx
├── functions/
│   ├── src/
│   │   ├── index.ts
│   │   ├── kakaoAuth.ts
│   │   └── mvpTally.ts
│   └── package.json
├── firestore.rules
└── firebase.json
```

---

## Task 1: Vite 프로젝트 스캐폴딩 및 의존성 설치

**Files:**
- Create: `vite.config.ts`, `src/test-setup.ts`, `src/index.css`

- [ ] **Step 1: Vite + React + TypeScript 프로젝트 생성**

```bash
npm create vite@latest . -- --template react-ts
```

- [ ] **Step 2: 런타임 의존성 설치**

```bash
npm install firebase react-router-dom
```

- [ ] **Step 3: 개발·테스트 의존성 설치**

```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

- [ ] **Step 4: Tailwind CSS v4 설치**

```bash
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 5: vite.config.ts 교체**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 6: src/test-setup.ts 생성**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 7: src/index.css 교체**

```css
@import "tailwindcss";
```

- [ ] **Step 8: tsconfig.app.json의 compilerOptions에 추가**

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

- [ ] **Step 9: 빌드 확인**

```bash
npm run build
```

Expected: `dist/` 생성, 에러 없음

- [ ] **Step 10: 커밋**

```bash
git add -A
git commit -m "chore: scaffold React + Vite + Tailwind CSS v4 + Vitest"
```

---

## Task 2: TypeScript 타입 정의

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: src/types/index.ts 생성**

```typescript
export type UserRole = 'pending' | 'member' | 'admin'

export interface AppUser {
  uid: string
  name: string
  kakaoId: string
  profileImage: string
  role: UserRole
  createdAt: Date
}

export type MatchStatus = 'voting' | 'confirmed' | 'cancelled' | 'completed'

export interface Match {
  id: string
  date: Date
  venue: string
  status: MatchStatus
  confirmedAt: Date | null
  voteDeadline: Date | null
  voteTallied: boolean
  createdBy: string
}

export type AttendanceStatus = 'attending' | 'absent'

export interface Attendance {
  matchId: string
  userId: string
  status: AttendanceStatus
  updatedAt: Date
}

export interface MvpVote {
  matchId: string
  voterId: string
  votedFor: string
  createdAt: Date
}

export interface UserStats {
  userId: string
  totalPoints: number
  attendanceCount: number
  mvp1st: number
  mvp2nd: number
  mvp3rd: number
}

export interface RankedUser {
  user: AppUser
  stats: UserStats
  rank: number
}
```

- [ ] **Step 2: 타입 체크 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/types/index.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Firebase 클라이언트 초기화

**Files:**
- Create: `src/firebase.ts`, `.env.local`, `.env.example`

- [ ] **Step 1: .env.example 생성**

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_KAKAO_JS_KEY=
VITE_KAKAO_REST_API_KEY=
VITE_KAKAO_REDIRECT_URI=http://localhost:5173/login
```

- [ ] **Step 2: .env.local 생성 (Firebase 콘솔 → 프로젝트 설정 → 앱 추가 → 웹 앱에서 값 복사)**

```
VITE_FIREBASE_API_KEY=실제값
VITE_FIREBASE_AUTH_DOMAIN=실제값
VITE_FIREBASE_PROJECT_ID=실제값
VITE_FIREBASE_STORAGE_BUCKET=실제값
VITE_FIREBASE_MESSAGING_SENDER_ID=실제값
VITE_FIREBASE_APP_ID=실제값
VITE_KAKAO_JS_KEY=실제값
VITE_KAKAO_REST_API_KEY=실제값
VITE_KAKAO_REDIRECT_URI=http://localhost:5173/login
```

- [ ] **Step 3: .gitignore에 .env.local 추가 확인**

`.gitignore`에 `.env.local`이 포함되어 있는지 확인. 없으면 추가.

- [ ] **Step 4: src/firebase.ts 생성**

```typescript
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app, 'asia-northeast3')
```

- [ ] **Step 5: 커밋**

```bash
git add src/firebase.ts .env.example .gitignore
git commit -m "chore: add Firebase client config"
```

---

## Task 4: AuthContext + useAuth 훅

**Files:**
- Create: `src/contexts/AuthContext.tsx`, `src/hooks/useAuth.ts`

- [ ] **Step 1: src/contexts/AuthContext.tsx 생성**

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { AppUser } from '../types'

interface AuthContextValue {
  firebaseUser: User | null
  appUser: AppUser | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  appUser: null,
  loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user)
      if (!user) {
        setAppUser(null)
        setLoading(false)
      }
    })
  }, [])

  useEffect(() => {
    if (!firebaseUser) return
    const ref = doc(db, 'users', firebaseUser.uid)
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setAppUser({ uid: firebaseUser.uid, ...snap.data() } as AppUser)
      } else {
        setAppUser(null)
      }
      setLoading(false)
    })
  }, [firebaseUser])

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const AuthContext_ = AuthContext
```

- [ ] **Step 2: src/hooks/useAuth.ts 생성**

```typescript
import { useContext } from 'react'
import { AuthContext_ } from '../contexts/AuthContext'

export function useAuth() {
  return useContext(AuthContext_)
}
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/contexts/AuthContext.tsx src/hooks/useAuth.ts
git commit -m "feat: add AuthContext and useAuth hook"
```

---

## Task 5: 인증 서비스 (Kakao OAuth 클라이언트 흐름)

**Files:**
- Create: `src/services/auth.ts`

Kakao 인증 흐름: 카카오 인증 서버 → 리다이렉트 with `code` → Cloud Function 호출 → Firebase Custom Token → Firebase 로그인

- [ ] **Step 1: src/services/auth.ts 생성**

```typescript
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
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/services/auth.ts
git commit -m "feat: add Kakao OAuth auth service"
```

---

## Task 6: Cloud Functions 초기화 및 Kakao 토큰 교환 함수

**Files:**
- Create: `functions/src/kakaoAuth.ts`, `functions/src/index.ts`

- [ ] **Step 1: functions 디렉토리로 이동 후 의존성 설치**

```bash
cd functions
npm install
npm install node-fetch firebase-admin
npm install -D @types/node-fetch
cd ..
```

- [ ] **Step 2: functions/src/kakaoAuth.ts 생성**

```typescript
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
      }),
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
```

- [ ] **Step 3: functions/src/index.ts 생성 (kakaoLogin만 export, mvpTally는 Task 19에서 추가)**

```typescript
import * as admin from 'firebase-admin'

admin.initializeApp()

export { kakaoLogin } from './kakaoAuth'
```

- [ ] **Step 4: functions/.env 생성 (Firebase 콘솔 → 프로젝트 설정에서 확인)**

```
KAKAO_REST_API_KEY=실제값
```

- [ ] **Step 5: functions 빌드 확인**

```bash
cd functions && npm run build && cd ..
```

Expected: `functions/lib/` 생성, 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add functions/
git commit -m "feat: add kakaoLogin Cloud Function"
```

---

## Task 7: ProtectedRoute 컴포넌트

**Files:**
- Create: `src/components/auth/ProtectedRoute.tsx`

- [ ] **Step 1: src/components/auth/ProtectedRoute.tsx 생성**

```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { UserRole } from '../../types'

interface Props {
  children: React.ReactNode
  requiredRole?: UserRole | UserRole[]
}

export function ProtectedRoute({ children, requiredRole }: Props) {
  const { appUser, loading } = useAuth()

  if (loading) return <div className="flex justify-center p-8">로딩 중...</div>

  if (!appUser) return <Navigate to="/login" replace />

  if (appUser.role === 'pending') return <Navigate to="/pending" replace />

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!roles.includes(appUser.role)) return <Navigate to="/" replace />
  }

  return <>{children}</>
}
```

- [ ] **Step 2: ProtectedRoute 테스트 작성**

`src/components/auth/ProtectedRoute.test.tsx` 생성:

```typescript
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute'

vi.mock('../../hooks/useAuth')

import { useAuth } from '../../hooks/useAuth'
const mockUseAuth = vi.mocked(useAuth)

function renderWithRouter(ui: React.ReactNode, initialPath = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/protected" element={ui} />
        <Route path="/login" element={<div>로그인 페이지</div>} />
        <Route path="/pending" element={<div>승인 대기 페이지</div>} />
        <Route path="/" element={<div>홈</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('로그인하지 않으면 /login으로 이동한다', () => {
    mockUseAuth.mockReturnValue({ firebaseUser: null, appUser: null, loading: false })
    renderWithRouter(<ProtectedRoute><div>보호된 페이지</div></ProtectedRoute>)
    expect(screen.getByText('로그인 페이지')).toBeInTheDocument()
  })

  it('pending 상태면 /pending으로 이동한다', () => {
    mockUseAuth.mockReturnValue({
      firebaseUser: {} as any,
      appUser: { uid: '1', role: 'pending' } as any,
      loading: false,
    })
    renderWithRouter(<ProtectedRoute><div>보호된 페이지</div></ProtectedRoute>)
    expect(screen.getByText('승인 대기 페이지')).toBeInTheDocument()
  })

  it('member는 보호된 페이지에 접근할 수 있다', () => {
    mockUseAuth.mockReturnValue({
      firebaseUser: {} as any,
      appUser: { uid: '1', role: 'member' } as any,
      loading: false,
    })
    renderWithRouter(<ProtectedRoute><div>보호된 페이지</div></ProtectedRoute>)
    expect(screen.getByText('보호된 페이지')).toBeInTheDocument()
  })

  it('admin 전용 페이지에 member가 접근하면 홈으로 이동한다', () => {
    mockUseAuth.mockReturnValue({
      firebaseUser: {} as any,
      appUser: { uid: '1', role: 'member' } as any,
      loading: false,
    })
    renderWithRouter(<ProtectedRoute requiredRole="admin"><div>관리자 페이지</div></ProtectedRoute>)
    expect(screen.getByText('홈')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: 테스트 실행 (실패 확인)**

```bash
npx vitest run src/components/auth/ProtectedRoute.test.tsx
```

Expected: FAIL (ProtectedRoute 아직 없음 — 이미 만들었으니 PASS도 가능)

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/components/auth/ProtectedRoute.test.tsx
```

Expected: 4 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/auth/
git commit -m "feat: add ProtectedRoute with role-based access"
```

---

## Task 8: Layout + Header

**Files:**
- Create: `src/components/layout/Header.tsx`, `src/components/layout/Layout.tsx`

- [ ] **Step 1: src/components/layout/Header.tsx 생성**

```typescript
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { signOut } from '../../services/auth'

export function Header() {
  const { appUser } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="bg-blue-600 text-white shadow-md">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-lg font-bold">CNU 풋살</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/schedule">경기 일정</Link>
          <Link to="/rankings">랭킹</Link>
          {appUser ? (
            <>
              <Link to="/mypage">마이페이지</Link>
              {appUser.role === 'admin' && <Link to="/admin">관리</Link>}
              <button onClick={handleSignOut} className="underline">로그아웃</button>
            </>
          ) : (
            <Link to="/login">로그인</Link>
          )}
        </nav>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: src/components/layout/Layout.tsx 생성**

```typescript
import { Outlet } from 'react-router-dom'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/layout/
git commit -m "feat: add Layout and Header components"
```

---

## Task 9: 라우터 + App 연결

**Files:**
- Modify: `src/main.tsx`, `src/App.tsx`
- Create: `src/router.tsx`, 각 페이지 파일 (빈 껍데기)

- [ ] **Step 1: 페이지 파일 껍데기 생성 (각각)**

`src/pages/HomePage.tsx`:
```typescript
export default function HomePage() {
  return <div>홈</div>
}
```

`src/pages/SchedulePage.tsx`:
```typescript
export default function SchedulePage() {
  return <div>경기 일정</div>
}
```

`src/pages/RankingsPage.tsx`:
```typescript
export default function RankingsPage() {
  return <div>랭킹</div>
}
```

`src/pages/LoginPage.tsx`:
```typescript
export default function LoginPage() {
  return <div>로그인</div>
}
```

`src/pages/PendingPage.tsx`:
```typescript
export default function PendingPage() {
  return <div>승인 대기 중입니다. 운영진의 승인을 기다려주세요.</div>
}
```

`src/pages/MatchDetailPage.tsx`:
```typescript
export default function MatchDetailPage() {
  return <div>경기 상세</div>
}
```

`src/pages/MyPage.tsx`:
```typescript
export default function MyPage() {
  return <div>마이페이지</div>
}
```

`src/pages/admin/AdminHomePage.tsx`:
```typescript
export default function AdminHomePage() {
  return <div>관리자 홈</div>
}
```

`src/pages/admin/AdminMatchesPage.tsx`:
```typescript
export default function AdminMatchesPage() {
  return <div>경기 관리</div>
}
```

`src/pages/admin/AdminMembersPage.tsx`:
```typescript
export default function AdminMembersPage() {
  return <div>회원 관리</div>
}
```

- [ ] **Step 2: src/router.tsx 생성**

```typescript
import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import HomePage from './pages/HomePage'
import SchedulePage from './pages/SchedulePage'
import RankingsPage from './pages/RankingsPage'
import LoginPage from './pages/LoginPage'
import PendingPage from './pages/PendingPage'
import MatchDetailPage from './pages/MatchDetailPage'
import MyPage from './pages/MyPage'
import AdminHomePage from './pages/admin/AdminHomePage'
import AdminMatchesPage from './pages/admin/AdminMatchesPage'
import AdminMembersPage from './pages/admin/AdminMembersPage'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/schedule', element: <SchedulePage /> },
      { path: '/rankings', element: <RankingsPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/pending', element: <PendingPage /> },
      {
        path: '/match/:id',
        element: <ProtectedRoute><MatchDetailPage /></ProtectedRoute>,
      },
      {
        path: '/mypage',
        element: <ProtectedRoute><MyPage /></ProtectedRoute>,
      },
      {
        path: '/admin',
        element: <ProtectedRoute requiredRole="admin"><AdminHomePage /></ProtectedRoute>,
      },
      {
        path: '/admin/matches',
        element: <ProtectedRoute requiredRole="admin"><AdminMatchesPage /></ProtectedRoute>,
      },
      {
        path: '/admin/members',
        element: <ProtectedRoute requiredRole="admin"><AdminMembersPage /></ProtectedRoute>,
      },
    ],
  },
])
```

- [ ] **Step 3: src/App.tsx 교체**

```typescript
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { router } from './router'

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
```

- [ ] **Step 4: src/main.tsx 확인 (기본값이면 그대로)**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5: 개발 서버 실행 후 각 라우트 확인**

```bash
npm run dev
```

브라우저에서 `/`, `/schedule`, `/rankings`, `/login` 접속 → 각 페이지 텍스트 표시 확인

- [ ] **Step 6: 커밋**

```bash
git add src/
git commit -m "feat: wire up router and page shells"
```

---

## Task 10: 로그인 페이지

**Files:**
- Modify: `src/pages/LoginPage.tsx`

Kakao code는 `?code=xxx` 쿼리 파라미터로 리다이렉트됨.

- [ ] **Step 1: src/pages/LoginPage.tsx 구현**

```typescript
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { redirectToKakaoLogin, loginWithKakaoCode } from '../services/auth'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { appUser } = useAuth()

  useEffect(() => {
    if (appUser) {
      navigate(appUser.role === 'pending' ? '/pending' : '/', { replace: true })
    }
  }, [appUser, navigate])

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) return

    setLoading(true)
    loginWithKakaoCode(code)
      .catch(() => setError('로그인에 실패했습니다. 다시 시도해주세요.'))
      .finally(() => setLoading(false))
  }, [searchParams])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <h1 className="text-2xl font-bold">CNU 풋살</h1>
      {error && <p className="text-red-500">{error}</p>}
      {loading ? (
        <p>로그인 중...</p>
      ) : (
        <button
          onClick={redirectToKakaoLogin}
          className="bg-yellow-400 text-black font-semibold px-6 py-3 rounded-lg hover:bg-yellow-300"
        >
          카카오로 로그인
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/pages/LoginPage.tsx
git commit -m "feat: implement Kakao login page"
```

---

## Task 11: users 서비스

**Files:**
- Create: `src/services/users.ts`

- [ ] **Step 1: src/services/users.ts 생성**

```typescript
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'
import { AppUser, UserRole } from '../types'

function docToUser(id: string, data: Record<string, any>): AppUser {
  return {
    uid: id,
    name: data.name,
    kakaoId: data.kakaoId,
    profileImage: data.profileImage,
    role: data.role as UserRole,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  }
}

export async function getPendingUsers(): Promise<AppUser[]> {
  const q = query(collection(db, 'users'), where('role', '==', 'pending'), orderBy('createdAt'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToUser(d.id, d.data()))
}

export async function getAllMembers(): Promise<AppUser[]> {
  const q = query(
    collection(db, 'users'),
    where('role', 'in', ['member', 'admin']),
    orderBy('createdAt')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToUser(d.id, d.data()))
}

export async function approveUser(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role: 'member' })
}

export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role })
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/services/users.ts
git commit -m "feat: add users Firestore service"
```

---

## Task 12: matches 서비스

**Files:**
- Create: `src/services/matches.ts`

- [ ] **Step 1: src/services/matches.ts 생성**

```typescript
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { Match, MatchStatus } from '../types'

function docToMatch(id: string, data: Record<string, any>): Match {
  return {
    id,
    date: data.date?.toDate() ?? new Date(),
    venue: data.venue,
    status: data.status as MatchStatus,
    confirmedAt: data.confirmedAt?.toDate() ?? null,
    voteDeadline: data.voteDeadline?.toDate() ?? null,
    voteTallied: data.voteTallied ?? false,
    createdBy: data.createdBy,
  }
}

export function subscribeToMatches(
  onData: (matches: Match[]) => void
): () => void {
  const q = query(collection(db, 'matches'), orderBy('date'))
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => docToMatch(d.id, d.data())))
  })
}

export async function getMatchesByMonth(year: number, month: number): Promise<Match[]> {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  const q = query(
    collection(db, 'matches'),
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<', Timestamp.fromDate(end)),
    orderBy('date')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToMatch(d.id, d.data()))
}

export async function createMatch(
  date: Date,
  venue: string,
  createdBy: string
): Promise<void> {
  await addDoc(collection(db, 'matches'), {
    date: Timestamp.fromDate(date),
    venue,
    status: 'voting',
    confirmedAt: null,
    voteDeadline: null,
    voteTallied: false,
    createdBy,
  })
}

export async function updateMatchStatus(
  matchId: string,
  status: MatchStatus
): Promise<void> {
  const updates: Record<string, any> = { status }

  if (status === 'confirmed') {
    updates.confirmedAt = Timestamp.now()
  }

  if (status === 'completed') {
    const deadline = new Date()
    deadline.setHours(deadline.getHours() + 24)
    updates.voteDeadline = Timestamp.fromDate(deadline)
    updates.voteTallied = false
  }

  await updateDoc(doc(db, 'matches', matchId), updates)
}

// 다음 달 월요일 날짜 목록 반환
export function getNextMonthMondays(): Date[] {
  const now = new Date()
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()
  const month = (now.getMonth() + 1) % 12

  const mondays: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
  while (d.getMonth() === month) {
    mondays.push(new Date(d))
    d.setDate(d.getDate() + 7)
  }
  return mondays
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/services/matches.ts
git commit -m "feat: add matches Firestore service"
```

---

## Task 13: attendances 서비스

**Files:**
- Create: `src/services/attendances.ts`

- [ ] **Step 1: src/services/attendances.ts 생성**

```typescript
import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { Attendance, AttendanceStatus } from '../types'

function attendanceId(matchId: string, userId: string) {
  return `${matchId}_${userId}`
}

function docToAttendance(data: Record<string, any>): Attendance {
  return {
    matchId: data.matchId,
    userId: data.userId,
    status: data.status as AttendanceStatus,
    updatedAt: data.updatedAt?.toDate() ?? new Date(),
  }
}

export async function setAttendance(
  matchId: string,
  userId: string,
  status: AttendanceStatus
): Promise<void> {
  const id = attendanceId(matchId, userId)
  await setDoc(doc(db, 'attendances', id), {
    matchId,
    userId,
    status,
    updatedAt: Timestamp.now(),
  })
}

export async function getAttendancesForMatch(matchId: string): Promise<Attendance[]> {
  const q = query(collection(db, 'attendances'), where('matchId', '==', matchId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToAttendance(d.data()))
}

export function subscribeToMatchAttendances(
  matchId: string,
  onData: (attendances: Attendance[]) => void
): () => void {
  const q = query(collection(db, 'attendances'), where('matchId', '==', matchId))
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => docToAttendance(d.data())))
  })
}

export async function getUserAttendances(userId: string): Promise<Attendance[]> {
  const q = query(collection(db, 'attendances'), where('userId', '==', userId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToAttendance(d.data()))
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/services/attendances.ts
git commit -m "feat: add attendances Firestore service"
```

---

## Task 14: votes 서비스

**Files:**
- Create: `src/services/votes.ts`

- [ ] **Step 1: src/services/votes.ts 생성**

```typescript
import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { MvpVote } from '../types'

function voteId(matchId: string, voterId: string) {
  return `${matchId}_${voterId}`
}

function docToVote(data: Record<string, any>): MvpVote {
  return {
    matchId: data.matchId,
    voterId: data.voterId,
    votedFor: data.votedFor,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  }
}

export async function castMvpVote(
  matchId: string,
  voterId: string,
  votedFor: string
): Promise<void> {
  if (voterId === votedFor) throw new Error('자기 자신에게 투표할 수 없습니다.')
  const id = voteId(matchId, voterId)
  await setDoc(doc(db, 'mvpVotes', id), {
    matchId,
    voterId,
    votedFor,
    createdAt: Timestamp.now(),
  })
}

export async function getVotesForMatch(matchId: string): Promise<MvpVote[]> {
  const q = query(collection(db, 'mvpVotes'), where('matchId', '==', matchId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToVote(d.data()))
}

export async function getMyVote(matchId: string, voterId: string): Promise<MvpVote | null> {
  const id = voteId(matchId, voterId)
  const snap = await getDocs(query(collection(db, 'mvpVotes'), where('__name__', '==', id)))
  if (snap.empty) return null
  return docToVote(snap.docs[0].data())
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/services/votes.ts
git commit -m "feat: add MVP votes Firestore service"
```

---

## Task 15: MVP 집계 유틸리티 + 테스트

**Files:**
- Create: `src/utils/mvpTally.ts`, `src/utils/mvpTally.test.ts`

- [ ] **Step 1: 실패 테스트 먼저 작성 — src/utils/mvpTally.test.ts 생성**

```typescript
import { describe, it, expect } from 'vitest'
import { tallyMvpVotes } from './mvpTally'

describe('tallyMvpVotes', () => {
  it('득표 없으면 빈 배열 반환', () => {
    expect(tallyMvpVotes([])).toEqual([])
  })

  it('1등 2등 3등 순서대로 점수 부여', () => {
    const result = tallyMvpVotes([
      { userId: 'a', votes: 5 },
      { userId: 'b', votes: 3 },
      { userId: 'c', votes: 1 },
    ])
    expect(result).toEqual([
      { userId: 'a', rank: 1, points: 3 },
      { userId: 'b', rank: 2, points: 2 },
      { userId: 'c', rank: 3, points: 1 },
    ])
  })

  it('공동 2등이면 3등 없음', () => {
    const result = tallyMvpVotes([
      { userId: 'a', votes: 5 },
      { userId: 'b', votes: 3 },
      { userId: 'c', votes: 3 },
      { userId: 'd', votes: 1 },
    ])
    expect(result).toEqual([
      { userId: 'a', rank: 1, points: 3 },
      { userId: 'b', rank: 2, points: 2 },
      { userId: 'c', rank: 2, points: 2 },
    ])
  })

  it('공동 1등이면 2등 없이 3등으로 넘어감', () => {
    const result = tallyMvpVotes([
      { userId: 'a', votes: 5 },
      { userId: 'b', votes: 5 },
      { userId: 'c', votes: 3 },
    ])
    expect(result).toEqual([
      { userId: 'a', rank: 1, points: 3 },
      { userId: 'b', rank: 1, points: 3 },
      { userId: 'c', rank: 3, points: 1 },
    ])
  })

  it('4위 이하는 포함하지 않음', () => {
    const result = tallyMvpVotes([
      { userId: 'a', votes: 5 },
      { userId: 'b', votes: 4 },
      { userId: 'c', votes: 3 },
      { userId: 'd', votes: 2 },
    ])
    expect(result.map((r) => r.userId)).not.toContain('d')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/utils/mvpTally.test.ts
```

Expected: FAIL (모듈 없음)

- [ ] **Step 3: src/utils/mvpTally.ts 구현**

```typescript
export interface VoteCount {
  userId: string
  votes: number
}

export interface TallyResult {
  userId: string
  rank: number
  points: number
}

const POINTS: Record<number, number> = { 1: 3, 2: 2, 3: 1 }

export function tallyMvpVotes(voteCounts: VoteCount[]): TallyResult[] {
  if (voteCounts.length === 0) return []

  const sorted = [...voteCounts].sort((a, b) => b.votes - a.votes)
  const results: TallyResult[] = []
  let rank = 1
  let i = 0

  while (i < sorted.length && rank <= 3) {
    const currentVotes = sorted[i].votes
    const tied: VoteCount[] = []

    while (i < sorted.length && sorted[i].votes === currentVotes) {
      tied.push(sorted[i])
      i++
    }

    for (const t of tied) {
      if (rank <= 3) {
        results.push({ userId: t.userId, rank, points: POINTS[rank] })
      }
    }

    rank += tied.length
  }

  return results
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/utils/mvpTally.test.ts
```

Expected: 5 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add src/utils/
git commit -m "feat: add MVP tally utility with tests"
```

---

## Task 16: userStats 서비스

**Files:**
- Create: `src/services/userStats.ts`

- [ ] **Step 1: src/services/userStats.ts 생성**

```typescript
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  orderBy,
  query,
  increment,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { UserStats } from '../types'

function defaultStats(userId: string): UserStats {
  return { userId, totalPoints: 0, attendanceCount: 0, mvp1st: 0, mvp2nd: 0, mvp3rd: 0 }
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const snap = await getDoc(doc(db, 'userStats', userId))
  if (!snap.exists()) return defaultStats(userId)
  return { userId, ...snap.data() } as UserStats
}

export async function getAllUserStats(): Promise<UserStats[]> {
  const snap = await getDocs(query(collection(db, 'userStats'), orderBy('totalPoints', 'desc')))
  return snap.docs.map((d) => ({ userId: d.id, ...d.data() } as UserStats))
}

export async function addAttendancePoint(userId: string): Promise<void> {
  const ref = doc(db, 'userStats', userId)
  await setDoc(
    ref,
    { totalPoints: increment(1), attendanceCount: increment(1) },
    { merge: true }
  )
}

export async function addMvpPoints(
  userId: string,
  rank: 1 | 2 | 3,
  points: number
): Promise<void> {
  const ref = doc(db, 'userStats', userId)
  const mvpField = `mvp${rank}st` as 'mvp1st' | 'mvp2nd' | 'mvp3rd'
  const rankField = rank === 1 ? 'mvp1st' : rank === 2 ? 'mvp2nd' : 'mvp3rd'
  await setDoc(
    ref,
    { totalPoints: increment(points), [rankField]: increment(1) },
    { merge: true }
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/services/userStats.ts
git commit -m "feat: add userStats Firestore service"
```

---

## Task 17: Cloud Function — MVP 스케줄 집계

**Files:**
- Modify: `functions/src/index.ts`
- Create: `functions/src/mvpTally.ts`

- [ ] **Step 1: functions/src/mvpTally.ts 생성**

```typescript
import * as admin from 'firebase-admin'
import { onSchedule } from 'firebase-functions/v2/scheduler'

const POINTS: Record<number, number> = { 1: 3, 2: 2, 3: 1 }

export const tallyMvpVotes = onSchedule(
  { schedule: 'every 60 minutes', region: 'asia-northeast3' },
  async () => {
    const db = admin.firestore()
    const now = admin.firestore.Timestamp.now()

    // 투표 마감됐지만 아직 집계 안 된 경기 조회
    const matchSnap = await db
      .collection('matches')
      .where('status', '==', 'completed')
      .where('voteTallied', '==', false)
      .where('voteDeadline', '<=', now)
      .get()

    for (const matchDoc of matchSnap.docs) {
      const matchId = matchDoc.id

      // 해당 경기 투표 조회
      const voteSnap = await db.collection('mvpVotes').where('matchId', '==', matchId).get()

      // 득표 집계
      const voteCounts: Record<string, number> = {}
      for (const v of voteSnap.docs) {
        const { votedFor } = v.data()
        voteCounts[votedFor] = (voteCounts[votedFor] ?? 0) + 1
      }

      const sorted = Object.entries(voteCounts)
        .map(([userId, votes]) => ({ userId, votes }))
        .sort((a, b) => b.votes - a.votes)

      // 순위 부여 (동점 처리)
      const batch = db.batch()
      let rank = 1
      let i = 0

      while (i < sorted.length && rank <= 3) {
        const currentVotes = sorted[i].votes
        const tied: string[] = []

        while (i < sorted.length && sorted[i].votes === currentVotes) {
          tied.push(sorted[i].userId)
          i++
        }

        for (const userId of tied) {
          if (rank <= 3) {
            const points = POINTS[rank]
            const statsRef = db.collection('userStats').doc(userId)
            const rankField = rank === 1 ? 'mvp1st' : rank === 2 ? 'mvp2nd' : 'mvp3rd'
            batch.set(
              statsRef,
              {
                totalPoints: admin.firestore.FieldValue.increment(points),
                [rankField]: admin.firestore.FieldValue.increment(1),
              },
              { merge: true }
            )
          }
        }

        rank += tied.length
      }

      // 참석자 출석 점수 (attending 상태인 사람만)
      const attendSnap = await db
        .collection('attendances')
        .where('matchId', '==', matchId)
        .where('status', '==', 'attending')
        .get()

      for (const a of attendSnap.docs) {
        const { userId } = a.data()
        const statsRef = db.collection('userStats').doc(userId)
        batch.set(
          statsRef,
          {
            totalPoints: admin.firestore.FieldValue.increment(1),
            attendanceCount: admin.firestore.FieldValue.increment(1),
          },
          { merge: true }
        )
      }

      // voteTallied = true
      batch.update(matchDoc.ref, { voteTallied: true })
      await batch.commit()
    }
  }
)
```

- [ ] **Step 2: functions/src/index.ts에 tallyMvpVotes 추가**

```typescript
import * as admin from 'firebase-admin'

admin.initializeApp()

export { kakaoLogin } from './kakaoAuth'
export { tallyMvpVotes } from './mvpTally'
```

- [ ] **Step 3: functions 빌드 확인**

```bash
cd functions && npm run build && cd ..
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add functions/src/
git commit -m "feat: add scheduled MVP tally Cloud Function"
```

---

## Task 18: 경기 일정 페이지

**Files:**
- Modify: `src/pages/SchedulePage.tsx`

- [ ] **Step 1: src/pages/SchedulePage.tsx 구현**

```typescript
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMatchesByMonth } from '../services/matches'
import { Match } from '../types'

const STATUS_LABEL: Record<string, string> = {
  voting: '신청 중',
  confirmed: '확정',
  cancelled: '취소',
  completed: '종료',
}

const STATUS_COLOR: Record<string, string> = {
  voting: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  completed: 'bg-purple-100 text-purple-700',
}

export default function SchedulePage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getMatchesByMonth(year, month)
      .then(setMatches)
      .finally(() => setLoading(false))
  }, [year, month])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="px-3 py-1 rounded bg-gray-100">‹</button>
        <h1 className="text-xl font-bold">{year}년 {month}월</h1>
        <button onClick={nextMonth} className="px-3 py-1 rounded bg-gray-100">›</button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">로딩 중...</p>
      ) : matches.length === 0 ? (
        <p className="text-center text-gray-400">등록된 경기가 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {matches.map((match) => (
            <li key={match.id}>
              <Link
                to={`/match/${match.id}`}
                className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">
                      {match.date.toLocaleDateString('ko-KR', {
                        month: 'long', day: 'numeric', weekday: 'short',
                      })}
                    </p>
                    <p className="text-sm text-gray-500">{match.venue}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[match.status]}`}>
                    {STATUS_LABEL[match.status]}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/pages/SchedulePage.tsx
git commit -m "feat: implement schedule page with month navigation"
```

---

## Task 19: 경기 상세 페이지 (참석/불참 + MVP 투표)

**Files:**
- Modify: `src/pages/MatchDetailPage.tsx`

- [ ] **Step 1: src/pages/MatchDetailPage.tsx 구현**

```typescript
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { subscribeToMatchAttendances, setAttendance } from '../services/attendances'
import { castMvpVote, getMyVote } from '../services/votes'
import { getAllMembers } from '../services/users'
import { Match, Attendance, AppUser } from '../types'

function docToMatch(id: string, data: Record<string, any>): Match {
  return {
    id,
    date: data.date?.toDate() ?? new Date(),
    venue: data.venue,
    status: data.status,
    confirmedAt: data.confirmedAt?.toDate() ?? null,
    voteDeadline: data.voteDeadline?.toDate() ?? null,
    voteTallied: data.voteTallied ?? false,
    createdBy: data.createdBy,
  }
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { appUser } = useAuth()
  const [match, setMatch] = useState<Match | null>(null)
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [members, setMembers] = useState<AppUser[]>([])
  const [myVote, setMyVote] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'matches', id)).then((snap) => {
      if (snap.exists()) setMatch(docToMatch(snap.id, snap.data()))
      setLoading(false)
    })
    getAllMembers().then(setMembers)
  }, [id])

  useEffect(() => {
    if (!id) return
    return subscribeToMatchAttendances(id, setAttendances)
  }, [id])

  useEffect(() => {
    if (!id || !appUser) return
    getMyVote(id, appUser.uid).then((v) => setMyVote(v?.votedFor ?? null))
  }, [id, appUser])

  if (loading) return <p className="text-center p-8">로딩 중...</p>
  if (!match) return <p className="text-center p-8">경기를 찾을 수 없습니다.</p>

  const attending = attendances.filter((a) => a.status === 'attending')
  const myAttendance = attendances.find((a) => a.userId === appUser?.uid)
  const canChangeAttendance = match.status === 'voting'
  const isVotingOpen =
    match.status === 'completed' &&
    !match.voteTallied &&
    match.voteDeadline &&
    match.voteDeadline > new Date()

  async function handleAttendanceToggle() {
    if (!appUser || !id) return
    const next = myAttendance?.status === 'attending' ? 'absent' : 'attending'
    await setAttendance(id, appUser.uid, next)
  }

  async function handleVote(votedFor: string) {
    if (!appUser || !id) return
    await castMvpVote(id, appUser.uid, votedFor)
    setMyVote(votedFor)
  }

  const memberMap = Object.fromEntries(members.map((m) => [m.uid, m]))

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <h1 className="text-xl font-bold">
          {match.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
        </h1>
        <p className="text-gray-500">{match.venue}</p>
        <p className="text-sm mt-1">
          참석 예정: <strong>{attending.length}명</strong>
        </p>
      </div>

      {appUser && canChangeAttendance && (
        <button
          onClick={handleAttendanceToggle}
          className={`w-full py-3 rounded-lg font-semibold ${
            myAttendance?.status === 'attending'
              ? 'bg-red-100 text-red-600'
              : 'bg-green-500 text-white'
          }`}
        >
          {myAttendance?.status === 'attending' ? '불참으로 변경' : '참석 신청'}
        </button>
      )}

      <div>
        <h2 className="font-semibold mb-2">참석자 ({attending.length}명)</h2>
        <ul className="space-y-1">
          {attending.map((a) => (
            <li key={a.userId} className="flex items-center justify-between bg-white rounded p-3 shadow-sm">
              <span>{memberMap[a.userId]?.name ?? a.userId}</span>
              {isVotingOpen && appUser && a.userId !== appUser.uid && (
                <button
                  onClick={() => handleVote(a.userId)}
                  disabled={!!myVote}
                  className={`text-sm px-3 py-1 rounded-full ${
                    myVote === a.userId
                      ? 'bg-yellow-400 text-black font-bold'
                      : myVote
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-blue-500 text-white'
                  }`}
                >
                  {myVote === a.userId ? 'MVP 투표함' : 'MVP 투표'}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/pages/MatchDetailPage.tsx
git commit -m "feat: implement match detail page with attendance and MVP voting"
```

---

## Task 20: 홈 페이지

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: src/pages/HomePage.tsx 구현**

```typescript
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMatchesByMonth } from '../services/matches'
import { getAllUserStats } from '../services/userStats'
import { getAllMembers } from '../services/users'
import { Match, UserStats, AppUser } from '../types'

export default function HomePage() {
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [topStats, setTopStats] = useState<(UserStats & { name: string })[]>([])

  useEffect(() => {
    const now = new Date()
    getMatchesByMonth(now.getFullYear(), now.getMonth() + 1).then((matches) => {
      setUpcomingMatches(matches.filter((m) => m.status !== 'cancelled' && m.date >= now).slice(0, 3))
    })

    Promise.all([getAllUserStats(), getAllMembers()]).then(([stats, members]) => {
      const memberMap = Object.fromEntries(members.map((m) => [m.uid, m.name]))
      setTopStats(
        stats.slice(0, 5).map((s) => ({ ...s, name: memberMap[s.userId] ?? s.userId }))
      )
    })
  }, [])

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-bold mb-3">다가오는 경기</h2>
        {upcomingMatches.length === 0 ? (
          <p className="text-gray-400 text-sm">예정된 경기가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {upcomingMatches.map((m) => (
              <li key={m.id}>
                <Link to={`/match/${m.id}`} className="block bg-white rounded-lg shadow p-3 hover:shadow-md">
                  <p className="font-medium">
                    {m.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                  </p>
                  <p className="text-sm text-gray-500">{m.venue}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link to="/schedule" className="text-sm text-blue-500 mt-2 inline-block">전체 일정 보기 →</Link>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">랭킹 TOP 5</h2>
        <ol className="space-y-2">
          {topStats.map((s, i) => (
            <li key={s.userId} className="flex items-center justify-between bg-white rounded-lg shadow p-3">
              <span className="font-bold text-gray-400 w-6">{i + 1}</span>
              <span className="flex-1">{s.name}</span>
              <span className="font-semibold text-blue-600">{s.totalPoints}점</span>
            </li>
          ))}
        </ol>
        <Link to="/rankings" className="text-sm text-blue-500 mt-2 inline-block">전체 랭킹 보기 →</Link>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: implement home page with upcoming matches and top rankings"
```

---

## Task 21: 랭킹 페이지

**Files:**
- Modify: `src/pages/RankingsPage.tsx`

- [ ] **Step 1: src/pages/RankingsPage.tsx 구현**

```typescript
import { useEffect, useState } from 'react'
import { getAllUserStats } from '../services/userStats'
import { getAllMembers } from '../services/users'
import { UserStats, AppUser } from '../types'

type RankedRow = UserStats & { name: string; profileImage: string; rank: number }

export default function RankingsPage() {
  const [rows, setRows] = useState<RankedRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAllUserStats(), getAllMembers()]).then(([stats, members]) => {
      const memberMap = Object.fromEntries(members.map((m) => [m.uid, m]))
      let rank = 1
      const ranked: RankedRow[] = []
      for (let i = 0; i < stats.length; i++) {
        if (i > 0 && stats[i].totalPoints < stats[i - 1].totalPoints) rank = i + 1
        const member = memberMap[stats[i].userId]
        if (!member) continue
        ranked.push({ ...stats[i], name: member.name, profileImage: member.profileImage, rank })
      }
      setRows(ranked)
      setLoading(false)
    })
  }, [])

  if (loading) return <p className="text-center p-8">로딩 중...</p>

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">랭킹</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="pb-2 w-8">#</th>
            <th className="pb-2">이름</th>
            <th className="pb-2 text-right">점수</th>
            <th className="pb-2 text-right">출석</th>
            <th className="pb-2 text-right">MVP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId} className="border-b last:border-0">
              <td className="py-3 font-bold text-gray-400">{r.rank}</td>
              <td className="py-3 flex items-center gap-2">
                {r.profileImage && (
                  <img src={r.profileImage} alt="" className="w-7 h-7 rounded-full object-cover" />
                )}
                {r.name}
              </td>
              <td className="py-3 text-right font-semibold text-blue-600">{r.totalPoints}</td>
              <td className="py-3 text-right">{r.attendanceCount}</td>
              <td className="py-3 text-right text-yellow-500">
                {r.mvp1st > 0 && `🥇${r.mvp1st} `}
                {r.mvp2nd > 0 && `🥈${r.mvp2nd} `}
                {r.mvp3rd > 0 && `🥉${r.mvp3rd}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/pages/RankingsPage.tsx
git commit -m "feat: implement rankings page"
```

---

## Task 22: 마이페이지

**Files:**
- Modify: `src/pages/MyPage.tsx`

- [ ] **Step 1: src/pages/MyPage.tsx 구현**

```typescript
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getUserStats } from '../services/userStats'
import { getUserAttendances } from '../services/attendances'
import { getMatchesByMonth } from '../services/matches'
import { UserStats, Attendance, Match } from '../types'
import { signOut } from '../services/auth'
import { useNavigate } from 'react-router-dom'

export default function MyPage() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [recentAttendances, setRecentAttendances] = useState<(Attendance & { match?: Match })[]>([])

  useEffect(() => {
    if (!appUser) return
    getUserStats(appUser.uid).then(setStats)

    const now = new Date()
    Promise.all([
      getUserAttendances(appUser.uid),
      getMatchesByMonth(now.getFullYear(), now.getMonth() + 1),
      getMatchesByMonth(now.getFullYear(), now.getMonth() === 0 ? 12 : now.getMonth()),
    ]).then(([attendances, thisMonth, lastMonth]) => {
      const matchMap = Object.fromEntries([...thisMonth, ...lastMonth].map((m) => [m.id, m]))
      setRecentAttendances(
        attendances
          .map((a) => ({ ...a, match: matchMap[a.matchId] }))
          .filter((a) => a.match)
          .sort((a, b) => (b.match!.date.getTime()) - (a.match!.date.getTime()))
          .slice(0, 10)
      )
    })
  }, [appUser])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  if (!appUser) return null

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
        {appUser.profileImage && (
          <img src={appUser.profileImage} alt="" className="w-14 h-14 rounded-full object-cover" />
        )}
        <div>
          <p className="font-bold text-lg">{appUser.name}</p>
          <p className="text-sm text-gray-400">{appUser.role === 'admin' ? '운영진' : '일반회원'}</p>
        </div>
        <button onClick={handleSignOut} className="ml-auto text-sm text-gray-400 underline">로그아웃</button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '총점', value: stats.totalPoints },
            { label: '출석', value: stats.attendanceCount },
            { label: 'MVP', value: stats.mvp1st + stats.mvp2nd + stats.mvp3rd },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-lg shadow p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-2">최근 참석 내역</h2>
        <ul className="space-y-2">
          {recentAttendances.map((a) => (
            <li key={a.matchId} className="bg-white rounded p-3 shadow-sm flex justify-between items-center">
              <span className="text-sm">
                {a.match?.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
              </span>
              <span className={`text-sm font-medium ${a.status === 'attending' ? 'text-green-600' : 'text-gray-400'}`}>
                {a.status === 'attending' ? '참석' : '불참'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/pages/MyPage.tsx
git commit -m "feat: implement my page"
```

---

## Task 23: 관리자 — 경기 관리 페이지

**Files:**
- Modify: `src/pages/admin/AdminMatchesPage.tsx`

- [ ] **Step 1: src/pages/admin/AdminMatchesPage.tsx 구현**

```typescript
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  subscribeToMatches,
  createMatch,
  updateMatchStatus,
  getNextMonthMondays,
} from '../../services/matches'
import { Match, MatchStatus } from '../../types'

const STATUS_ACTIONS: Partial<Record<MatchStatus, { next: MatchStatus; label: string; className: string }[]>> = {
  voting: [
    { next: 'confirmed', label: '경기 확정', className: 'bg-green-500 text-white' },
    { next: 'cancelled', label: '경기 취소', className: 'bg-red-100 text-red-600' },
  ],
  confirmed: [
    { next: 'completed', label: '경기 완료', className: 'bg-purple-500 text-white' },
    { next: 'cancelled', label: '경기 취소', className: 'bg-red-100 text-red-600' },
  ],
}

export default function AdminMatchesPage() {
  const { appUser } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [venue, setVenue] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    return subscribeToMatches(setMatches)
  }, [])

  async function handleCreateNextMonthMatches() {
    if (!appUser || !venue.trim()) return
    setCreating(true)
    const mondays = getNextMonthMondays()
    for (const date of mondays) {
      await createMatch(date, venue.trim(), appUser.uid)
    }
    setVenue('')
    setCreating(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">경기 관리</h1>

      <div className="bg-white rounded-lg shadow p-4 space-y-3">
        <h2 className="font-semibold">다음 달 경기 일괄 생성</h2>
        <input
          type="text"
          placeholder="경기장 이름"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        />
        <button
          onClick={handleCreateNextMonthMatches}
          disabled={!venue.trim() || creating}
          className="w-full bg-blue-600 text-white rounded py-2 text-sm font-semibold disabled:opacity-50"
        >
          {creating ? '생성 중...' : '월요일 경기 일괄 생성'}
        </button>
      </div>

      <ul className="space-y-3">
        {matches.map((match) => (
          <li key={match.id} className="bg-white rounded-lg shadow p-4">
            <p className="font-semibold">
              {match.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
            </p>
            <p className="text-sm text-gray-500 mb-3">{match.venue} · {match.status}</p>
            <div className="flex gap-2 flex-wrap">
              {STATUS_ACTIONS[match.status]?.map(({ next, label, className }) => (
                <button
                  key={next}
                  onClick={() => updateMatchStatus(match.id, next)}
                  className={`text-sm px-3 py-1 rounded-full font-medium ${className}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/pages/admin/AdminMatchesPage.tsx
git commit -m "feat: implement admin matches management page"
```

---

## Task 24: 관리자 홈 — 회원 승인

**Files:**
- Modify: `src/pages/admin/AdminHomePage.tsx`

- [ ] **Step 1: src/pages/admin/AdminHomePage.tsx 구현**

```typescript
import { useEffect, useState } from 'react'
import { getPendingUsers, approveUser } from '../../services/users'
import { AppUser } from '../../types'

export default function AdminHomePage() {
  const [pending, setPending] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const users = await getPendingUsers()
    setPending(users)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleApprove(uid: string) {
    await approveUser(uid)
    setPending((prev) => prev.filter((u) => u.uid !== uid))
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">가입 승인 대기</h1>
      {loading ? (
        <p className="text-center text-gray-400">로딩 중...</p>
      ) : pending.length === 0 ? (
        <p className="text-gray-400 text-sm">대기 중인 가입 신청이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((user) => (
            <li key={user.uid} className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
              {user.profileImage && (
                <img src={user.profileImage} alt="" className="w-10 h-10 rounded-full object-cover" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{user.name}</p>
                <p className="text-xs text-gray-400">
                  가입 신청: {user.createdAt.toLocaleDateString('ko-KR')}
                </p>
              </div>
              <button
                onClick={() => handleApprove(user.uid)}
                className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-full"
              >
                승인
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/pages/admin/AdminHomePage.tsx
git commit -m "feat: implement admin home with member approval"
```

---

## Task 25: 관리자 — 회원 관리 페이지

**Files:**
- Modify: `src/pages/admin/AdminMembersPage.tsx`

- [ ] **Step 1: src/pages/admin/AdminMembersPage.tsx 구현**

```typescript
import { useEffect, useState } from 'react'
import { getAllMembers, setUserRole } from '../../services/users'
import { AppUser, UserRole } from '../../types'

export default function AdminMembersPage() {
  const [members, setMembers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllMembers().then(setMembers).finally(() => setLoading(false))
  }, [])

  async function handleRoleChange(uid: string, role: UserRole) {
    await setUserRole(uid, role)
    setMembers((prev) => prev.map((m) => (m.uid === uid ? { ...m, role } : m)))
  }

  if (loading) return <p className="text-center p-8">로딩 중...</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">회원 관리</h1>
      <ul className="space-y-3">
        {members.map((member) => (
          <li key={member.uid} className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
            {member.profileImage && (
              <img src={member.profileImage} alt="" className="w-10 h-10 rounded-full object-cover" />
            )}
            <div className="flex-1">
              <p className="font-semibold">{member.name}</p>
              <p className="text-xs text-gray-400">{member.role}</p>
            </div>
            <select
              value={member.role}
              onChange={(e) => handleRoleChange(member.uid, e.target.value as UserRole)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="member">일반회원</option>
              <option value="admin">운영진</option>
            </select>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/pages/admin/AdminMembersPage.tsx
git commit -m "feat: implement admin members page"
```

---

## Task 26: 카카오톡 공유하기

**Files:**
- Modify: `src/pages/MatchDetailPage.tsx`, `index.html`

카카오 JavaScript SDK를 `index.html`에 로드하고, 경기 상세 페이지에 공유 버튼 추가.

- [ ] **Step 1: index.html의 `<head>`에 Kakao SDK 추가**

```html
<script src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"
  integrity="sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4"
  crossorigin="anonymous"></script>
```

- [ ] **Step 2: src/services/auth.ts에 Kakao SDK 초기화 추가**

`auth.ts` 파일 맨 위에:

```typescript
declare global {
  interface Window {
    Kakao: any
  }
}

export function initKakaoSdk() {
  if (window.Kakao && !window.Kakao.isInitialized()) {
    window.Kakao.init(import.meta.env.VITE_KAKAO_JS_KEY)
  }
}
```

- [ ] **Step 3: src/App.tsx에서 initKakaoSdk 호출**

```typescript
import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { router } from './router'
import { initKakaoSdk } from './services/auth'

export default function App() {
  useEffect(() => { initKakaoSdk() }, [])

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
```

- [ ] **Step 4: MatchDetailPage.tsx에 공유 버튼 추가**

기존 `return` 블록 내 `<div className="space-y-6">` 안에 추가:

```typescript
function handleKakaoShare() {
  const attendingNames = attending
    .map((a) => memberMap[a.userId]?.name ?? '알 수 없음')
    .join(', ')

  window.Kakao.Share.sendDefault({
    objectType: 'text',
    text: `⚽ CNU 풋살 경기 안내\n\n📅 ${match!.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}\n📍 ${match!.venue}\n👥 참석 (${attending.length}명): ${attendingNames}`,
    link: {
      mobileWebUrl: window.location.href,
      webUrl: window.location.href,
    },
  })
}
```

공유 버튼을 참석자 섹션 위에 추가:

```typescript
<button
  onClick={handleKakaoShare}
  className="w-full bg-yellow-400 text-black font-semibold py-2 rounded-lg"
>
  카카오톡으로 참석자 공유
</button>
```

- [ ] **Step 5: 커밋**

```bash
git add index.html src/services/auth.ts src/App.tsx src/pages/MatchDetailPage.tsx
git commit -m "feat: add KakaoTalk share button on match detail page"
```

---

## Task 27: Firestore 보안 규칙

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: firestore.rules 작성**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuth() {
      return request.auth != null;
    }

    function isMember() {
      return isAuth() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['member', 'admin'];
    }

    function isAdmin() {
      return isAuth() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /users/{uid} {
      allow read: if isAuth();
      allow write: if isAdmin() || request.auth.uid == uid;
    }

    match /matches/{matchId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /attendances/{docId} {
      allow read: if true;
      allow write: if isMember() &&
        request.auth.uid == resource.data.userId ||
        isAdmin();
      allow create: if isMember() &&
        request.auth.uid == request.resource.data.userId;
    }

    match /mvpVotes/{docId} {
      allow read: if isMember();
      allow create: if isMember() &&
        request.auth.uid == request.resource.data.voterId &&
        request.auth.uid != request.resource.data.votedFor;
      allow update, delete: if false;
    }

    match /userStats/{uid} {
      allow read: if true;
      allow write: if false; // Cloud Function만 쓰기 가능
    }
  }
}
```

- [ ] **Step 2: 규칙 배포**

```bash
firebase deploy --only firestore:rules
```

- [ ] **Step 3: 커밋**

```bash
git add firestore.rules
git commit -m "feat: add Firestore security rules"
```

---

## Task 28: Firebase Hosting 배포

**Files:**
- Modify: `firebase.json`

- [ ] **Step 1: firebase.json hosting 설정 확인/수정**

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  },
  "firestore": {
    "rules": "firestore.rules"
  },
  "functions": {
    "source": "functions",
    "codebase": "default",
    "ignore": ["node_modules", ".git", "firebase-debug.log", "firebase-debug.*.log"]
  }
}
```

- [ ] **Step 2: 프로덕션 빌드**

```bash
npm run build
```

Expected: `dist/` 생성, 에러 없음

- [ ] **Step 3: Cloud Functions + Hosting 배포**

```bash
firebase deploy
```

Expected: `Hosting URL: https://<project-id>.web.app` 출력

- [ ] **Step 4: .env.local의 `VITE_KAKAO_REDIRECT_URI`를 배포 URL로 업데이트**

```
VITE_KAKAO_REDIRECT_URI=https://<project-id>.web.app/login
```

Kakao Developers 콘솔에도 동일 URI 등록.

- [ ] **Step 5: 재빌드 후 재배포**

```bash
npm run build && firebase deploy --only hosting
```

- [ ] **Step 6: 최종 커밋 + 푸시**

```bash
git add firebase.json
git commit -m "chore: configure Firebase Hosting for production"
git push origin main
```

---

## 자체 검토 — 스펙 커버리지

| 요구사항 | 커버 Task |
|----------|-----------|
| PC/모바일 반응형 | Task 8 (max-w-2xl Layout) |
| 카카오 로그인 | Task 5, 6, 10 |
| 운영진 승인 절차 | Task 6 (Cloud Function), Task 24 |
| 로그인 없이 조회 | Task 9 (ProtectedRoute), Task 27 (보안 규칙) |
| 경기 일정 월별 조회 | Task 18 |
| 참석 신청/변경 | Task 13, 19 |
| 관리자 경기 확정/취소 | Task 12, 23 |
| 카카오톡 공유 | Task 26 |
| MVP 투표 | Task 14, 19 |
| 투표 24시간 제한 | Task 12 (voteDeadline), Task 17 |
| 동점 처리 | Task 15 (tallyMvpVotes) |
| 점수 집계 (참석 1점, MVP 3/2/1점) | Task 16, 17 |
| 랭킹 페이지 | Task 21 |
| 마이페이지 | Task 22 |
| Firestore 보안 규칙 | Task 27 |
| 무료 배포 | Task 28 (Firebase Hosting) |
