# Dark Mode Toggle + Jersey Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual dark/light mode toggle with futsal-themed colors (white jersey = light, black jersey = dark) and a jersey SVG icon in the rankings page.

**Architecture:** A `ThemeContext` holds the current theme and a toggle function, persists to `localStorage`, and toggles the `.dark` class on `<html>`. Tailwind v4's `@custom-variant` directive makes all `dark:` utility classes work. Every page/component gets `dark:` class variants added — visual-only, no logic changes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, Vite

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `src/index.css` | Add `@custom-variant dark` |
| Create | `src/contexts/ThemeContext.tsx` | New context + provider + hook |
| Modify | `src/App.tsx` | Wrap with `ThemeProvider` |
| Modify | `src/components/layout/Layout.tsx` | Add dark bg |
| Modify | `src/components/layout/Header.tsx` | Dark bg + toggle button |
| Modify | `src/pages/HomePage.tsx` | Dark variants |
| Modify | `src/pages/SchedulePage.tsx` | Dark variants |
| Modify | `src/pages/MatchDetailPage.tsx` | Dark variants |
| Modify | `src/pages/RankingsPage.tsx` | Dark variants + JerseyIcon |
| Modify | `src/pages/MyPage.tsx` | Dark variants |
| Modify | `src/pages/LoginPage.tsx` | Dark variants |
| Modify | `src/pages/PendingPage.tsx` | Dark variants |
| Modify | `src/pages/RegisterPage.tsx` | Dark variants |
| Modify | `src/pages/admin/AdminHomePage.tsx` | Dark variants |
| Modify | `src/pages/admin/AdminMatchesPage.tsx` | Dark variants |
| Modify | `src/pages/admin/AdminMembersPage.tsx` | Dark variants |
| Modify | `src/pages/admin/MatchRegisterWizard.tsx` | Dark variants |

---

## Task 1: Configure Tailwind v4 dark mode variant

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Edit `src/index.css`**

Replace:
```css
@import "tailwindcss";
```
With:
```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "feat: configure Tailwind v4 class-based dark mode variant"
```

---

## Task 2: Create ThemeContext

**Files:**
- Create: `src/contexts/ThemeContext.tsx`

- [ ] **Step 1: Create `src/contexts/ThemeContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'light',
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('theme') as Theme) ?? 'light'
  )

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggle() {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/ThemeContext.tsx
git commit -m "feat: add ThemeContext with localStorage persistence"
```

---

## Task 3: Wrap App with ThemeProvider

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Edit `src/App.tsx`**

Current:
```tsx
import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { router } from './router'
import { initKakaoSdk } from './services/auth'
import { autoCompleteMatches } from './services/matches'

export default function App() {
  useEffect(() => {
    initKakaoSdk()
    autoCompleteMatches().catch(() => {})
  }, [])

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
```

Replace with:
```tsx
import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { router } from './router'
import { initKakaoSdk } from './services/auth'
import { autoCompleteMatches } from './services/matches'

export default function App() {
  useEffect(() => {
    initKakaoSdk()
    autoCompleteMatches().catch(() => {})
  }, [])

  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wrap App with ThemeProvider"
```

---

## Task 4: Update Layout and Header

**Files:**
- Modify: `src/components/layout/Layout.tsx`
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Edit `src/components/layout/Layout.tsx`**

Change `bg-gray-50` → `bg-gray-50 dark:bg-gray-950`:

```tsx
import { Outlet } from 'react-router-dom'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Edit `src/components/layout/Header.tsx`**

Add dark mode classes to the header and a toggle button:

```tsx
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { signOut } from '../../services/auth'
import { useTheme } from '../../contexts/ThemeContext'

export function Header() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="bg-blue-600 dark:bg-gray-900 text-white shadow-md dark:shadow-none dark:border-b dark:border-gray-700">
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
          <button onClick={toggle} className="text-lg" aria-label="테마 전환">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </nav>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Layout.tsx src/components/layout/Header.tsx
git commit -m "feat: add dark mode classes to Layout and Header with toggle button"
```

---

## Task 5: Dark mode for HomePage

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Edit `src/pages/HomePage.tsx`**

Apply dark variants to each element. Full replacement:

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMatchesByMonth } from '../services/matches'
import { calculateAllStats } from '../services/userStats'
import { getAllUsers } from '../services/users'
import { Match, UserStats } from '../types'

export default function HomePage() {
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [topStats, setTopStats] = useState<(UserStats & { name: string })[]>([])

  useEffect(() => {
    const now = new Date()
    getMatchesByMonth(now.getFullYear(), now.getMonth() + 1).then((matches) => {
      setUpcomingMatches(matches.filter((m) => m.status !== 'cancelled' && m.date >= now).slice(0, 3))
    })

    Promise.all([calculateAllStats(), getAllUsers()]).then(([stats, users]) => {
      const memberMap = Object.fromEntries(users.map((m) => [m.uid, m.name]))
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
          <p className="text-gray-400 dark:text-gray-500 text-sm">예정된 경기가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {upcomingMatches.map((m) => (
              <li key={m.id}>
                <Link to={`/match/${m.id}`} className="block bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-3 hover:shadow-md">
                  <p className="font-medium">
                    {m.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{m.venue}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link to="/schedule" className="text-sm text-blue-500 dark:text-amber-400 mt-2 inline-block">전체 일정 보기 →</Link>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">랭킹 TOP 5</h2>
        <ol className="space-y-2">
          {topStats.map((s, i) => (
            <li key={s.userId} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-3">
              <span className="font-bold text-gray-400 dark:text-gray-500 w-6">{i + 1}</span>
              <span className="flex-1">{s.name}</span>
              <span className="font-semibold text-blue-600 dark:text-amber-400">{s.totalPoints}점</span>
            </li>
          ))}
        </ol>
        <Link to="/rankings" className="text-sm text-blue-500 dark:text-amber-400 mt-2 inline-block">전체 랭킹 보기 →</Link>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: add dark mode classes to HomePage"
```

---

## Task 6: Dark mode for SchedulePage

**Files:**
- Modify: `src/pages/SchedulePage.tsx`

- [ ] **Step 1: Edit `src/pages/SchedulePage.tsx`**

The `STATUS_COLOR` map needs dark variants for the badges. The nav buttons and cards also need dark classes.

```tsx
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getMatchesByMonth } from '../services/matches'
import { Match } from '../types'

const STATUS_LABEL: Record<string, string> = {
  voting: '신청 중',
  confirmed: '확정',
  cancelled: '취소',
  completed: '종료',
}

const STATUS_COLOR: Record<string, string> = {
  voting: 'bg-blue-100 text-blue-700 dark:bg-amber-900/30 dark:text-amber-300',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  completed: 'bg-purple-100 text-purple-700',
}

export default function SchedulePage() {
  const now = new Date()
  const [searchParams, setSearchParams] = useSearchParams()
  const year = Number(searchParams.get('year')) || now.getFullYear()
  const month = Number(searchParams.get('month')) || now.getMonth() + 1
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getMatchesByMonth(year, month)
      .then(setMatches)
      .finally(() => setLoading(false))
  }, [year, month])

  const isAtMin = year === 2026 && month === 2
  const prevMonthVal = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  const nextMonthVal = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }

  function prevMonth() {
    if (isAtMin) return
    setSearchParams({ year: String(prevMonthVal.year), month: String(prevMonthVal.month) })
  }

  function nextMonth() {
    setSearchParams({ year: String(nextMonthVal.year), month: String(nextMonthVal.month) })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} disabled={isAtMin} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 dark:text-gray-200 disabled:opacity-30">‹</button>
        <h1 className="text-xl font-bold">{year}년 {month}월</h1>
        <button onClick={nextMonth} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 dark:text-gray-200">›</button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 dark:text-gray-400">로딩 중...</p>
      ) : matches.length === 0 ? (
        <p className="text-center text-gray-400 dark:text-gray-500">등록된 경기가 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {matches.map((match) => (
            <li key={match.id}>
              <Link
                to={`/match/${match.id}`}
                className="block bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4 hover:shadow-md transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">
                      {match.date.toLocaleDateString('ko-KR', {
                        month: 'long', day: 'numeric', weekday: 'short',
                      })}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{match.venue}</p>
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

- [ ] **Step 2: Commit**

```bash
git add src/pages/SchedulePage.tsx
git commit -m "feat: add dark mode classes to SchedulePage"
```

---

## Task 7: Dark mode for MatchDetailPage

**Files:**
- Modify: `src/pages/MatchDetailPage.tsx`

- [ ] **Step 1: Edit `src/pages/MatchDetailPage.tsx`**

Key changes (full replacement — only className changes):

```tsx
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { subscribeToMatchAttendances, setAttendance } from '../services/attendances'
import { castMomVote, getMyVote } from '../services/votes'
import { getMomResult } from '../services/momResults'
import { getAllUsers } from '../services/users'
import { setMatchPhoto, getMatchPhoto } from '../services/photos'
import { Match, Attendance, AppUser, MomResult, MatchPhoto } from '../types'

function docToMatch(id: string, data: Record<string, any>): Match {
  return {
    id,
    date: data.date?.toDate() ?? new Date(),
    time: data.time ?? '',
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
  const navigate = useNavigate()
  const [match, setMatch] = useState<Match | null>(null)
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [members, setMembers] = useState<AppUser[]>([])
  const [myVote, setMyVote] = useState<string | null>(null)
  const [momResult, setMomResult] = useState<MomResult | null>(null)
  const [photo, setPhoto] = useState<MatchPhoto | null>(null)
  const [lightbox, setLightbox] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'matches', id)).then((snap) => {
      if (snap.exists()) setMatch(docToMatch(snap.id, snap.data()))
      setLoading(false)
    })
    getAllUsers().then(setMembers)
    getMomResult(id).then(setMomResult)
    getMatchPhoto(id).then(setPhoto)
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
  const isCompleted = match.status === 'completed'
  const isAttending = attending.some((a) => a.userId === appUser?.uid)
  const isVotingOpen =
    match.status === 'completed' &&
    !match.voteTallied &&
    match.voteDeadline &&
    match.voteDeadline > new Date() &&
    isAttending

  async function handleAttendanceToggle() {
    if (!appUser || !id) return
    const next = myAttendance?.status === 'attending' ? 'absent' : 'attending'
    await setAttendance(id, appUser.uid, next)
  }

  async function handleVote(votedFor: string) {
    if (!appUser || !id) return
    await castMomVote(id, appUser.uid, votedFor)
    setMyVote(votedFor)
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!appUser || !id || !e.target.files?.length) return
    setUploading(true)
    try {
      const newPhoto = await setMatchPhoto(id, appUser.uid, e.target.files[0])
      setPhoto(newPhoto)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleKakaoShare() {
    const attendingNames = attending
      .map((a) => a.userId ? (memberMap[a.userId]?.name ?? '알 수 없음') : '알 수 없음')
      .join(', ')

    window.Kakao.Share.sendDefault({
      objectType: 'text',
      text: `⚽ CNU 풋살 경기 안내\n\n📅 ${match!.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}${match!.time ? ' ' + match!.time : ''}\n📍 ${match!.venue}\n👥 참석 (${attending.length}명): ${attendingNames}`,
      link: { mobileWebUrl: window.location.href, webUrl: window.location.href },
    })
  }

  function getAttendeeName(a: Attendance): string {
    if (a.userId) return memberMap[a.userId]?.name ?? '알 수 없음'
    return '알 수 없음'
  }

  const memberMap = Object.fromEntries(members.map((m) => [m.uid, m]))

  return (
    <>
      {/* 라이트박스 */}
      {lightbox && photo && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setLightbox(false)}
        >
          <img
            src={photo.url}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white text-3xl leading-none"
            onClick={() => setLightbox(false)}
          >
            ×
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelect}
      />

      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400"
        >
          ← 뒤로
        </button>

        {/* 커버 사진 — 완료된 경기만 */}
        {isCompleted && (
          <div
            className="w-full aspect-video bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden relative"
            onClick={() => photo && !uploading && setLightbox(true)}
          >
            {photo ? (
              <>
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
                {appUser && (
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                    disabled={uploading}
                    className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm"
                  >
                    {uploading ? '업로드 중...' : '사진 수정'}
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => appUser && fileInputRef.current?.click()}
                disabled={uploading || !appUser}
                className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 disabled:cursor-default"
              >
                {uploading ? (
                  <span className="text-sm">업로드 중...</span>
                ) : appUser ? (
                  <>
                    <span className="text-3xl">📷</span>
                    <span className="text-sm">경기 사진 추가</span>
                  </>
                ) : null}
              </button>
            )}
          </div>
        )}

        {/* 경기 정보 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4">
          <h1 className="text-xl font-bold">
            {match.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
            {match.time && <span className="text-base font-normal text-gray-500 dark:text-gray-400 ml-2">{match.time}</span>}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">{match.venue}</p>
          <p className="text-sm mt-1">
            {isCompleted ? '참석' : '참석 예정'}: <strong>{attending.length}명</strong>
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

        {!isCompleted && (
          <button
            onClick={handleKakaoShare}
            className="w-full bg-yellow-400 text-black font-semibold py-2 rounded-lg"
          >
            카카오톡으로 참석자 공유
          </button>
        )}

        {momResult && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4">
            <h2 className="font-semibold mb-3">MOM</h2>
            {momResult.first.length > 0 && (
              <p className="text-sm mb-1">
                <span className="mr-1">🥇</span>
                {momResult.first.map((uid) => memberMap[uid]?.name ?? uid).join(', ')}
              </p>
            )}
            {momResult.second.length > 0 && (
              <p className="text-sm mb-1">
                <span className="mr-1">🥈</span>
                {momResult.second.map((uid) => memberMap[uid]?.name ?? uid).join(', ')}
              </p>
            )}
            {momResult.third.length > 0 && (
              <p className="text-sm">
                <span className="mr-1">🥉</span>
                {momResult.third.map((uid) => memberMap[uid]?.name ?? uid).join(', ')}
              </p>
            )}
          </div>
        )}

        <div>
          <h2 className="font-semibold mb-2">{isCompleted ? '참석자' : '참석 예정자'} ({attending.length}명)</h2>
          <ul className="space-y-1">
            {attending.map((a, i) => (
              <li key={a.userId ?? i} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-3 shadow-sm dark:shadow-none dark:ring-1 dark:ring-gray-700">
                <span>{getAttendeeName(a)}</span>
                {isVotingOpen && appUser && a.userId !== appUser.uid && (
                  <button
                    onClick={() => handleVote(a.userId!)}
                    disabled={!!myVote}
                    className={`text-sm px-3 py-1 rounded-full ${
                      myVote === a.userId
                        ? 'bg-yellow-400 text-black font-bold'
                        : myVote
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                        : 'bg-blue-500 dark:bg-amber-500 text-white'
                    }`}
                  >
                    {myVote === a.userId ? 'MOM 투표함' : 'MOM 투표'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/MatchDetailPage.tsx
git commit -m "feat: add dark mode classes to MatchDetailPage"
```

---

## Task 8: Dark mode + Jersey icon for RankingsPage

**Files:**
- Modify: `src/pages/RankingsPage.tsx`

- [ ] **Step 1: Edit `src/pages/RankingsPage.tsx`**

Add `JerseyIcon` component and `useTheme` import. Apply dark variants throughout.

```tsx
import { useEffect, useState } from 'react'
import { calculateAllStats } from '../services/userStats'
import { getAllUsers } from '../services/users'
import { UserStats } from '../types'
import { useTheme } from '../contexts/ThemeContext'

type RankedRow = UserStats & { name: string; rank: number; isGuest: boolean }

function JerseyIcon({ dark }: { dark?: boolean }) {
  const fill = dark ? '#1a1a2e' : '#ffffff'
  const stroke = dark ? '#f59e0b' : '#1e3a8a'
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 2L4 5.5V10H7V21H17V10H20V5.5L15 2C15 2 14 4 12 4C10 4 9 2 9 2Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function RankingsPage() {
  const [rows, setRows] = useState<RankedRow[]>([])
  const [loading, setLoading] = useState(true)
  const { theme } = useTheme()

  useEffect(() => {
    Promise.all([calculateAllStats(), getAllUsers()]).then(([stats, users]) => {
      const userMap = Object.fromEntries(users.map((u) => [u.uid, u]))
      let rank = 1
      const ranked: RankedRow[] = []
      for (let i = 0; i < stats.length; i++) {
        if (i > 0 && stats[i].totalPoints < stats[i - 1].totalPoints) rank = i + 1
        const user = userMap[stats[i].userId]
        if (!user) continue
        ranked.push({
          ...stats[i],
          name: user.name,
          rank,
          isGuest: user.role === 'guest',
        })
      }
      setRows(ranked)
      setLoading(false)
    })
  }, [])

  if (loading) return <p className="text-center p-8">로딩 중...</p>

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">랭킹</h1>

      <div className="bg-yellow-50 dark:bg-amber-900/20 border border-yellow-200 dark:border-amber-700 rounded-lg p-3 mb-4 text-sm">
        <p className="font-semibold text-yellow-800 dark:text-amber-300 mb-1">MOM (Man of the Match) 제도 안내</p>
        <ul className="text-yellow-700 dark:text-amber-400 space-y-0.5">
          <li>• 점수: 1등 3점 / 2등 2점 / 3등 1점 / 참석자 0.5점</li>
          <li>• 투표 대상: 경기 참석자만 투표 가능</li>
        </ul>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
            <th className="pb-2 w-8">#</th>
            <th className="pb-2">이름</th>
            <th className="pb-2 text-right">점수</th>
            <th className="pb-2 text-right">출석</th>
            <th className="pb-2 text-right">MOM</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId} className="border-b dark:border-gray-700 last:border-0">
              <td className="py-3 font-bold text-gray-400 dark:text-gray-500">{r.rank}</td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <JerseyIcon dark={theme === 'dark'} />
                  <span>{r.name}</span>
                  {r.isGuest && (
                    <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">비회원</span>
                  )}
                </div>
              </td>
              <td className="py-3 text-right font-semibold text-blue-600 dark:text-amber-400">{r.totalPoints}</td>
              <td className="py-3 text-right">{r.attendanceCount}</td>
              <td className="py-3 text-right text-yellow-500">
                {r.mom1st > 0 && `🥇${r.mom1st} `}
                {r.mom2nd > 0 && `🥈${r.mom2nd} `}
                {r.mom3rd > 0 && `🥉${r.mom3rd}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/RankingsPage.tsx
git commit -m "feat: add dark mode classes and jersey icon to RankingsPage"
```

---

## Task 9: Dark mode for MyPage

**Files:**
- Modify: `src/pages/MyPage.tsx`

- [ ] **Step 1: Edit `src/pages/MyPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { calculateUserStats } from '../services/userStats'
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
    calculateUserStats(appUser.uid).then(setStats)

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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4 flex items-center gap-4">
        <div>
          <p className="font-bold text-lg">{appUser.name}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">{appUser.role === 'admin' ? '운영진' : '일반회원'}</p>
        </div>
        <button onClick={handleSignOut} className="ml-auto text-sm text-gray-400 dark:text-gray-500 underline">로그아웃</button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '총점', value: stats.totalPoints },
            { label: '출석', value: stats.attendanceCount },
            { label: 'MOM', value: stats.mom1st + stats.mom2nd + stats.mom3rd },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-3 text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-amber-400">{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-2">최근 참석 내역</h2>
        <ul className="space-y-2">
          {recentAttendances.map((a) => (
            <li key={a.matchId} className="bg-white dark:bg-gray-800 rounded p-3 shadow-sm dark:shadow-none dark:ring-1 dark:ring-gray-700 flex justify-between items-center">
              <span className="text-sm">
                {a.match?.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
              </span>
              <span className={`text-sm font-medium ${a.status === 'attending' ? 'text-green-600' : 'text-gray-400 dark:text-gray-500'}`}>
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

- [ ] **Step 2: Commit**

```bash
git add src/pages/MyPage.tsx
git commit -m "feat: add dark mode classes to MyPage"
```

---

## Task 10: Dark mode for LoginPage, PendingPage, RegisterPage

**Files:**
- Modify: `src/pages/LoginPage.tsx`
- Modify: `src/pages/PendingPage.tsx`
- Modify: `src/pages/RegisterPage.tsx`

- [ ] **Step 1: Edit `src/pages/LoginPage.tsx`**

The Kakao button keeps its yellow color (brand). Add dark text color to heading/loading text:

```tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { redirectToKakaoLogin, loginWithKakaoCode } from '../services/auth'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { appUser } = useAuth()
  const loginAttempted = useRef(false)

  useEffect(() => {
    if (appUser) {
      if (!appUser.nameConfirmed) {
        navigate('/register', { replace: true })
      } else {
        navigate(appUser.role === 'pending' ? '/pending' : '/', { replace: true })
      }
    }
  }, [appUser, navigate])

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code || loginAttempted.current) return

    loginAttempted.current = true
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
        <p className="text-gray-600 dark:text-gray-300">로그인 중...</p>
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

- [ ] **Step 2: Edit `src/pages/PendingPage.tsx`**

```tsx
export default function PendingPage() {
  return (
    <div className="text-gray-700 dark:text-gray-200">
      승인 대기 중입니다. 운영진의 승인을 기다려주세요.
    </div>
  )
}
```

- [ ] **Step 3: Edit `src/pages/RegisterPage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { updateUserName } from '../services/users'

export default function RegisterPage() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || !appUser) return
    if (trimmed.length < 2) {
      setError('이름은 2자 이상 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      await updateUserName(appUser.uid, trimmed)
      navigate('/pending', { replace: true })
    } catch {
      setError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <h1 className="text-2xl font-bold">환영합니다!</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm text-center">정확한 명단 관리를 위해 꼭 실명으로 입력해주세요.<br/>실명이 아닐 경우 승인이 거절될 수 있습니다.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-xs">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="실명 입력 (예: 홍길동)"
          className="border dark:border-gray-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          maxLength={20}
          autoFocus
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={!name.trim() || loading}
          className="bg-blue-600 dark:bg-amber-500 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
        >
          {loading ? '저장 중...' : '완료'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/LoginPage.tsx src/pages/PendingPage.tsx src/pages/RegisterPage.tsx
git commit -m "feat: add dark mode classes to LoginPage, PendingPage, RegisterPage"
```

---

## Task 11: Dark mode for Admin pages

**Files:**
- Modify: `src/pages/admin/AdminHomePage.tsx`
- Modify: `src/pages/admin/AdminMatchesPage.tsx`
- Modify: `src/pages/admin/AdminMembersPage.tsx`

- [ ] **Step 1: Edit `src/pages/admin/AdminHomePage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPendingUsers, approveUser } from '../../services/users'
import { AppUser } from '../../types'

export default function AdminHomePage() {
  const [pending, setPending] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const users = await getPendingUsers()
      setPending(users)
    } catch (e) {
      console.error('getPendingUsers 오류:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleApprove(user: AppUser) {
    await approveUser(user.uid, user.name)
    setPending((prev) => prev.filter((u) => u.uid !== user.uid))
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <Link to="/admin/matches" className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4 flex flex-col gap-1 active:opacity-70">
          <span className="text-2xl">⚽</span>
          <span className="font-semibold text-sm">경기 관리</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">일정 생성 · 상태 변경</span>
        </Link>
        <Link to="/admin/members" className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4 flex flex-col gap-1 active:opacity-70">
          <span className="text-2xl">👥</span>
          <span className="font-semibold text-sm">회원 관리</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">역할 변경</span>
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold mb-4">가입 승인 대기</h1>
        {loading ? (
          <p className="text-center text-gray-400 dark:text-gray-500">로딩 중...</p>
        ) : pending.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm">대기 중인 가입 신청이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((user) => (
              <li key={user.uid} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    가입 신청: {user.createdAt.toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <button
                  onClick={() => handleApprove(user)}
                  className="bg-blue-600 dark:bg-amber-500 text-white text-sm px-4 py-1.5 rounded-full"
                >
                  승인
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Edit `src/pages/admin/AdminMatchesPage.tsx`**

Key dark variants to apply:
- Modal overlay `bg-white` → `dark:bg-gray-800`
- `text-gray-600` → `dark:text-gray-300`
- `bg-gray-100` buttons → `dark:bg-gray-700 dark:text-gray-200`
- `bg-blue-600` → `dark:bg-amber-500`
- Match list items `bg-white` → `dark:bg-gray-800`
- Input fields add `dark:border-gray-600 dark:bg-gray-700 dark:text-white`

```tsx
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  subscribeToMatches,
  createMatch,
  updateMatchStatus,
  deleteMatch,
  getNextMonthMondays,
} from '../../services/matches'
import { Match, MatchStatus } from '../../types'
import MatchRegisterWizard from './MatchRegisterWizard'

const STATUS_LABELS: Record<MatchStatus, string> = {
  voting: '투표중',
  confirmed: '확정',
  completed: '완료',
  cancelled: '취소',
}

const STATUS_ACTIONS: Partial<Record<MatchStatus, { next: MatchStatus; label: string; className: string }[]>> = {
  voting: [
    { next: 'confirmed', label: '경기 확정', className: 'bg-green-500 text-white' },
  ],
  confirmed: [
    { next: 'completed', label: '경기 완료', className: 'bg-purple-500 text-white' },
  ],
}

export default function AdminMatchesPage() {
  const { appUser } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [venue, setVenue] = useState('')
  const [creating, setCreating] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Match | null>(null)
  const [editMatch, setEditMatch] = useState<Match | null>(null)
  const now = new Date()
  const [filterYear, setFilterYear] = useState(now.getFullYear())
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1)

  useEffect(() => {
    return subscribeToMatches(setMatches)
  }, [])

  async function handleCreateNextMonthMatches() {
    if (!appUser || !venue.trim()) return
    setCreating(true)
    const mondays = getNextMonthMondays()
    for (const date of mondays) {
      await createMatch(date, '', venue.trim(), appUser.uid)
    }
    setVenue('')
    setCreating(false)
  }

  async function handleStatusChange(matchId: string, next: MatchStatus) {
    await updateMatchStatus(matchId, next)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await deleteMatch(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <>
      {showWizard && (
        <MatchRegisterWizard
          onClose={() => setShowWizard(false)}
          onComplete={() => setShowWizard(false)}
        />
      )}

      {editMatch && (
        <MatchRegisterWizard
          editMatch={editMatch}
          onClose={() => setEditMatch(null)}
          onComplete={() => setEditMatch(null)}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 w-full max-w-sm space-y-4">
            <h2 className="font-bold text-lg">경기 삭제</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {deleteTarget.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })} 경기를 삭제하시겠습니까? 참석 정보도 함께 삭제됩니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">경기 관리</h1>
          <button
            onClick={() => setShowWizard(true)}
            className="bg-blue-600 dark:bg-amber-500 text-white text-sm px-4 py-2 rounded-lg font-semibold"
          >
            + 경기 등록
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4 space-y-3">
          <h2 className="font-semibold text-sm text-gray-600 dark:text-gray-300">다음 달 경기 일괄 생성</h2>
          <input
            type="text"
            placeholder="경기장 이름"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
          />
          <button
            onClick={handleCreateNextMonthMatches}
            disabled={!venue.trim() || creating}
            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded py-2 text-sm font-semibold disabled:opacity-50"
          >
            {creating ? '생성 중...' : '월요일 경기 일괄 생성'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (filterYear === 2026 && filterMonth === 2) return
              if (filterMonth === 1) { setFilterYear(y => y - 1); setFilterMonth(12) }
              else setFilterMonth(m => m - 1)
            }}
            disabled={filterYear === 2026 && filterMonth === 2}
            className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 dark:text-gray-200 disabled:opacity-30"
          >‹</button>
          <span className="font-semibold">{filterYear}년 {filterMonth}월</span>
          <button
            onClick={() => {
              if (filterMonth === 12) { setFilterYear(y => y + 1); setFilterMonth(1) }
              else setFilterMonth(m => m + 1)
            }}
            className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 dark:text-gray-200"
          >›</button>
        </div>

        {(() => {
          const filtered = matches.filter(
            (m) => m.date.getFullYear() === filterYear && m.date.getMonth() + 1 === filterMonth
          )
          if (filtered.length === 0) return (
            <p className="text-center text-gray-400 dark:text-gray-500 py-6">등록된 경기가 없습니다.</p>
          )
          return (
            <ul className="space-y-3">
              {filtered.map((match) => (
                <li key={match.id} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4">
                  <p className="font-semibold">
                    {match.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                    {match.time && <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">{match.time}</span>}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {match.venue} · <span className="font-medium">{STATUS_LABELS[match.status]}</span>
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setEditMatch(match)}
                      className="text-sm px-3 py-1 rounded-full font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => setDeleteTarget(match)}
                      className="text-sm px-3 py-1 rounded-full font-medium bg-red-100 text-red-600"
                    >
                      삭제
                    </button>
                    {STATUS_ACTIONS[match.status]?.map(({ next, label, className }) => (
                      <button
                        key={next}
                        onClick={() => handleStatusChange(match.id, next)}
                        className={`text-sm px-3 py-1 rounded-full font-medium ${className}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )
        })()}
      </div>
    </>
  )
}
```

- [ ] **Step 3: Edit `src/pages/admin/AdminMembersPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { getAllMembers, setUserRole } from '../../services/users'
import { useAuth } from '../../hooks/useAuth'
import { AppUser, UserRole } from '../../types'

const ROLE_LABELS: Record<string, string> = {
  member: '일반회원',
  admin: '운영진',
}

export default function AdminMembersPage() {
  const { appUser } = useAuth()
  const [members, setMembers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllMembers().then(setMembers).finally(() => setLoading(false))
  }, [])

  async function handleRoleChange(member: AppUser, role: UserRole) {
    const label = ROLE_LABELS[role]
    if (!confirm(`${member.name}님을 ${label}으로 변경하시겠습니까?`)) return
    await setUserRole(member.uid, role)
    setMembers((prev) => prev.map((m) => (m.uid === member.uid ? { ...m, role } : m)))
  }

  if (loading) return <p className="text-center p-8">로딩 중...</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">회원 관리</h1>
      <ul className="space-y-3">
        {members.map((member) => {
          const isSelf = member.uid === appUser?.uid
          return (
            <li key={member.uid} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold">{member.name} {isSelf && <span className="text-xs text-blue-500 dark:text-amber-400">(나)</span>}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{ROLE_LABELS[member.role] ?? member.role}</p>
              </div>
              {isSelf ? (
                <span className="text-xs text-gray-300 dark:text-gray-600">변경 불가</span>
              ) : (
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member, e.target.value as UserRole)}
                  className="text-sm border dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700 dark:text-white"
                >
                  <option value="member">일반회원</option>
                  <option value="admin">운영진</option>
                </select>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/AdminHomePage.tsx src/pages/admin/AdminMatchesPage.tsx src/pages/admin/AdminMembersPage.tsx
git commit -m "feat: add dark mode classes to Admin pages"
```

---

## Task 12: Dark mode for MatchRegisterWizard

**Files:**
- Modify: `src/pages/admin/MatchRegisterWizard.tsx`

- [ ] **Step 1: Edit `src/pages/admin/MatchRegisterWizard.tsx`**

This is the largest file. Apply dark variants surgically to each section. The full replacement:

```tsx
import { useState, useEffect } from 'react'
import { updateDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../hooks/useAuth'
import { getAllUsers, getOrCreateGuestUser } from '../../services/users'
import { createMatch, getAllMatches } from '../../services/matches'
import { saveMatchAttendances, getAttendancesForMatch, setAttendance } from '../../services/attendances'
import { saveMomResult, getMomResult } from '../../services/momResults'
import { isMatchInPast } from '../../utils/matchTime'
import { AppUser, Match } from '../../types'

interface Props {
  onClose: () => void
  onComplete: () => void
  editMatch?: Match
}

interface BasicInfo {
  date: string
  time: string
  venue: string
}

interface MomSelections {
  first: string[]
  second: string[]
  third: string[]
}

export default function MatchRegisterWizard({ onClose, onComplete, editMatch }: Props) {
  const { appUser } = useAuth()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [members, setMembers] = useState<AppUser[]>([])
  const [pastGuests, setPastGuests] = useState<AppUser[]>([])
  const [timeHistory, setTimeHistory] = useState<string[]>([])
  const [venueHistory, setVenueHistory] = useState<string[]>([])
  const [basicInfo, setBasicInfo] = useState<BasicInfo>(() => {
    if (editMatch) {
      const d = editMatch.date
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return { date: dateStr, time: editMatch.time, venue: editMatch.venue }
    }
    return { date: '', time: '', venue: '' }
  })
  const [selectedUids, setSelectedUids] = useState<string[]>([])
  const [selectedGuestUids, setSelectedGuestUids] = useState<string[]>([])
  const [guests, setGuests] = useState<string[]>([])
  const [guestInput, setGuestInput] = useState('')
  const [guestError, setGuestError] = useState('')
  const [mom, setMom] = useState<MomSelections>({ first: [], second: [], third: [] })
  const [submitting, setSubmitting] = useState(false)
  const [originalAttendingUids, setOriginalAttendingUids] = useState<Set<string>>(new Set())

  const totalCount = selectedUids.length + selectedGuestUids.length + guests.length
  const isPast = basicInfo.date && basicInfo.time
    ? isMatchInPast(basicInfo.date, basicInfo.time)
    : false

  useEffect(() => {
    Promise.all([
      getAllUsers(),
      getAllMatches(),
      editMatch ? getAttendancesForMatch(editMatch.id) : Promise.resolve([]),
      editMatch ? getMomResult(editMatch.id) : Promise.resolve(null),
    ]).then(([users, matches, attendances, momResult]) => {
      const memberUsers = users.filter((u) => u.role === 'member' || u.role === 'admin')
      const guestUsers = users.filter((u) => u.role === 'guest')
      setMembers(memberUsers)
      setPastGuests(guestUsers)

      const times = [...new Set(matches.map((m) => m.time).filter(Boolean))]
      const venues = [...new Set(matches.map((m) => m.venue).filter(Boolean))]
      setTimeHistory(times)
      setVenueHistory(venues)

      if (editMatch && attendances.length > 0) {
        const attendingUids = attendances
          .filter((a) => a.status === 'attending')
          .map((a) => a.userId!)
          .filter(Boolean)
        setOriginalAttendingUids(new Set(attendingUids))
        const memberUidSet = new Set(memberUsers.map((m) => m.uid))
        const guestUidSet = new Set(guestUsers.map((g) => g.uid))
        setSelectedUids(attendingUids.filter((uid) => memberUidSet.has(uid)))
        setSelectedGuestUids(attendingUids.filter((uid) => guestUidSet.has(uid)))
      }

      if (momResult) {
        setMom({ first: momResult.first, second: momResult.second, third: momResult.third })
      }
    })
  }, [])

  function toggleMember(uid: string) {
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]
    )
  }

  function togglePastGuest(uid: string) {
    setSelectedGuestUids((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]
    )
  }

  function addGuest() {
    const name = guestInput.trim()
    if (!name) return
    if (members.some((m) => m.name === name)) {
      setGuestError('이미 회원입니다. 위 회원 목록에서 선택해주세요.')
      return
    }
    if (pastGuests.some((g) => g.name === name)) {
      setGuestError('이전 비회원 목록에 있습니다. 위에서 선택해주세요.')
      return
    }
    if (guests.includes(name)) {
      setGuestError('이미 추가된 이름입니다.')
      return
    }
    setGuests((prev) => [...prev, name])
    setGuestInput('')
    setGuestError('')
  }

  function removeGuest(name: string) {
    setGuests((prev) => prev.filter((g) => g !== name))
  }

  function toggleMom(rank: keyof MomSelections, id: string) {
    const otherRanks = (['first', 'second', 'third'] as (keyof MomSelections)[]).filter((r) => r !== rank)
    if (otherRanks.some((r) => mom[r].includes(id))) return
    setMom((prev) => ({
      ...prev,
      [rank]: prev[rank].includes(id)
        ? prev[rank].filter((x) => x !== id)
        : [...prev[rank], id],
    }))
  }

  function isTakenByOther(rank: keyof MomSelections, id: string) {
    return (['first', 'second', 'third'] as (keyof MomSelections)[])
      .filter((r) => r !== rank)
      .some((r) => mom[r].includes(id))
  }

  function getRankLabel(id: string): string | null {
    if (mom.first.includes(id)) return '1등'
    if (mom.second.includes(id)) return '2등'
    if (mom.third.includes(id)) return '3등'
    return null
  }

  const allAttendees = [
    ...members.filter((m) => selectedUids.includes(m.uid)).map((m) => ({ id: m.uid, label: m.name })),
    ...pastGuests.filter((g) => selectedGuestUids.includes(g.uid)).map((g) => ({ id: g.uid, label: g.name })),
    ...guests.map((g) => ({ id: `guest_${g}`, label: g })),
  ]

  async function handleSubmit() {
    if (!appUser) return
    setSubmitting(true)
    try {
      const [year, month, day] = basicInfo.date.split('-').map(Number)
      const [hour, minute] = basicInfo.time.split(':').map(Number)
      const matchDate = new Date(year, month - 1, day, hour, minute)
      const status = isPast ? 'completed' : 'confirmed'

      const matchId = await createMatch(matchDate, basicInfo.time, basicInfo.venue, appUser.uid, status)

      const guestUidMap: Record<string, string> = {}
      for (const name of guests) {
        guestUidMap[`guest_${name}`] = await getOrCreateGuestUser(name)
      }

      const allUids = [...selectedUids, ...selectedGuestUids, ...Object.values(guestUidMap)]
      await saveMatchAttendances(matchId, allUids)

      if (isPast && (mom.first.length > 0 || mom.second.length > 0)) {
        const remap = (ids: string[]) => ids.map((id) => guestUidMap[id] ?? id)
        await saveMomResult(matchId, remap(mom.first), remap(mom.second), remap(mom.third))
      }

      onComplete()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEditSubmit() {
    if (!editMatch) return
    setSubmitting(true)
    try {
      const [year, month, day] = basicInfo.date.split('-').map(Number)
      const matchDate = new Date(year, month - 1, day)
      const updates: Record<string, any> = {
        date: Timestamp.fromDate(matchDate),
        time: basicInfo.time,
        venue: basicInfo.venue.trim(),
      }
      await updateDoc(doc(db, 'matches', editMatch.id), updates)

      const newGuestUidMap: Record<string, string> = {}
      for (const name of guests) {
        newGuestUidMap[`guest_${name}`] = await getOrCreateGuestUser(name)
      }

      const finalAttendingUids = new Set([
        ...selectedUids,
        ...selectedGuestUids,
        ...Object.values(newGuestUidMap),
      ])
      const toAdd = [...finalAttendingUids].filter((uid) => !originalAttendingUids.has(uid))
      const toRemove = [...originalAttendingUids].filter((uid) => !finalAttendingUids.has(uid))
      await Promise.all([
        ...toAdd.map((uid) => setAttendance(editMatch.id, uid, 'attending')),
        ...toRemove.map((uid) => setAttendance(editMatch.id, uid, 'absent')),
      ])

      if (isPast && (mom.first.length > 0 || mom.second.length > 0)) {
        const remap = (ids: string[]) => ids.map((id) => newGuestUidMap[id] ?? id)
        await saveMomResult(editMatch.id, remap(mom.first), remap(mom.second), remap(mom.third))
      }

      onComplete()
    } finally {
      setSubmitting(false)
    }
  }

  const step1Valid = basicInfo.date && basicInfo.time && basicInfo.venue.trim()
  const step2Valid = totalCount > 0

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
          <h2 className="font-bold text-lg">{editMatch ? '경기 수정' : '경기 등록'}</h2>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 text-2xl leading-none">×</button>
        </div>

        {/* 단계 표시 */}
        <div className="flex gap-2 px-4 py-3">
          {(['기본정보', '참석자', 'MOM'] as const).map((label, i) => (
            <div
              key={label}
              className={`flex-1 text-center text-xs py-1.5 rounded-md font-medium ${
                step === i + 1
                  ? 'bg-blue-600 dark:bg-amber-500 text-white'
                  : step > i + 1
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-400'
              }`}
            >
              {step > i + 1 ? `✓ ${label}` : `${i + 1}. ${label}`}
            </div>
          ))}
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto px-4 py-2">

          {/* Step 1: 기본정보 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200 block mb-1">날짜</label>
                <input
                  type="date"
                  value={basicInfo.date}
                  onChange={(e) => setBasicInfo((p) => ({ ...p, date: e.target.value }))}
                  className="w-full border dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200 block mb-1">시간</label>
                <input
                  type="time"
                  value={basicInfo.time}
                  onChange={(e) => setBasicInfo((p) => ({ ...p, time: e.target.value }))}
                  className="w-full border dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm dark:bg-gray-700 dark:text-white"
                />
                {timeHistory.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {timeHistory.map((t) => (
                      <button
                        key={t}
                        onClick={() => setBasicInfo((p) => ({ ...p, time: t }))}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          basicInfo.time === t
                            ? 'bg-blue-600 dark:bg-amber-500 text-white border-blue-600 dark:border-amber-500'
                            : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200 block mb-1">경기장</label>
                <input
                  type="text"
                  placeholder="예: CNU 실내 체육관"
                  value={basicInfo.venue}
                  onChange={(e) => setBasicInfo((p) => ({ ...p, venue: e.target.value }))}
                  className="w-full border dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm dark:bg-gray-700 dark:text-white"
                />
                {venueHistory.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {venueHistory.map((v) => (
                      <button
                        key={v}
                        onClick={() => setBasicInfo((p) => ({ ...p, venue: v }))}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          basicInfo.venue === v
                            ? 'bg-blue-600 dark:bg-amber-500 text-white border-blue-600 dark:border-amber-500'
                            : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: 참석자 */}
          {step === 2 && (
            <div className="space-y-4">
              {/* 회원 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">회원</span>
                  <span className="text-sm font-semibold text-blue-600 dark:text-amber-400">{totalCount}명</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {members.map((m) => {
                    const selected = selectedUids.includes(m.uid)
                    return (
                      <button
                        key={m.uid}
                        onClick={() => toggleMember(m.uid)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm text-left transition-colors ${
                          selected
                            ? 'border-blue-500 dark:border-amber-500 bg-blue-50 dark:bg-amber-900/20 font-semibold'
                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                      >
                        {selected ? '✓' : '○'} {m.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 이전 비회원 */}
              {pastGuests.length > 0 && (
                <div className="border-t dark:border-gray-700 pt-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">이전 비회원</p>
                  <div className="grid grid-cols-2 gap-2">
                    {pastGuests.map((g) => {
                      const selected = selectedGuestUids.includes(g.uid)
                      return (
                        <button
                          key={g.uid}
                          onClick={() => togglePastGuest(g.uid)}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm text-left transition-colors ${
                            selected
                              ? 'border-yellow-400 bg-yellow-50 dark:bg-amber-900/20 font-semibold'
                              : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
                          }`}
                        >
                          {selected ? '✓' : '○'} {g.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 새 비회원 입력 */}
              <div className="border-t dark:border-gray-700 pt-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">새 비회원 추가</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={guestInput}
                    onChange={(e) => { setGuestInput(e.target.value); setGuestError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && addGuest()}
                    placeholder="이름 입력"
                    className={`flex-1 border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white ${guestError ? 'border-red-400' : ''}`}
                  />
                  <button
                    onClick={addGuest}
                    disabled={!guestInput.trim()}
                    className="bg-blue-600 dark:bg-amber-500 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-40"
                  >
                    추가
                  </button>
                </div>
                {guestError && (
                  <p className="text-red-500 text-xs mt-1">{guestError}</p>
                )}
                <div className="mt-2 space-y-1.5">
                  {guests.map((g) => (
                    <div key={g} className="flex items-center justify-between bg-yellow-50 dark:bg-amber-900/20 border border-yellow-200 dark:border-amber-700 rounded-lg px-3 py-2 text-sm">
                      <span>{g} <span className="text-xs text-yellow-700 dark:text-amber-400">(신규)</span></span>
                      <button onClick={() => removeGuest(g)} className="text-red-400 text-lg leading-none">×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: MOM */}
          {step === 3 && (
            <div className="space-y-4">
              {!isPast ? (
                <div className="bg-blue-50 dark:bg-amber-900/20 rounded-xl p-4 text-center text-sm text-blue-700 dark:text-amber-300">
                  <p className="text-2xl mb-2">🗳️</p>
                  <p className="font-semibold">경기 완료 후 참석자 투표로</p>
                  <p>MOM이 자동 선정됩니다.</p>
                </div>
              ) : (
                <>
                  {(['first', 'second', 'third'] as (keyof MomSelections)[]).map((rank, i) => {
                    const emoji = ['🥇', '🥈', '🥉'][i]
                    const label = ['1등', '2등', '3등'][i]
                    return (
                      <div key={rank}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{emoji}</span>
                          <span className="font-semibold text-sm">{label}</span>
                          {mom[rank].length > 0 && (
                            <span className="text-xs bg-blue-100 dark:bg-amber-900/30 text-blue-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                              {mom[rank].length}명
                            </span>
                          )}
                          {rank === 'third' && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">선택 안 해도 됨</span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {allAttendees.map(({ id, label: name }) => {
                            const selected = mom[rank].includes(id)
                            const takenByOther = isTakenByOther(rank, id)
                            const takenLabel = getRankLabel(id)
                            return (
                              <button
                                key={id}
                                onClick={() => toggleMom(rank, id)}
                                disabled={takenByOther}
                                className={`p-2 rounded-lg border text-xs text-center transition-colors ${
                                  selected
                                    ? rank === 'first'
                                      ? 'border-yellow-400 bg-yellow-50 dark:bg-amber-900/30 font-bold'
                                      : rank === 'second'
                                      ? 'border-gray-400 bg-gray-100 dark:bg-gray-700 font-bold'
                                      : 'border-amber-600 bg-amber-50 dark:bg-amber-900/30 font-bold'
                                    : takenByOther
                                    ? 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600'
                                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
                                }`}
                              >
                                {name}
                                {takenByOther && takenLabel && (
                                  <div className="text-yellow-500 text-[10px]">{takenLabel}</div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 px-4 py-3 border-t dark:border-gray-700">
          <button
            onClick={() => step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : onClose()}
            className="flex-1 py-2.5 rounded-lg border dark:border-gray-600 dark:text-gray-200 text-sm font-medium"
          >
            {step === 1 ? '취소' : '← 이전'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              disabled={step === 1 ? !step1Valid : !step2Valid}
              className="flex-[2] py-2.5 rounded-lg bg-blue-600 dark:bg-amber-500 text-white text-sm font-semibold disabled:opacity-40"
            >
              다음 →
            </button>
          ) : (
            <button
              onClick={editMatch ? handleEditSubmit : handleSubmit}
              disabled={submitting}
              className="flex-[2] py-2.5 rounded-lg bg-blue-600 dark:bg-amber-500 text-white text-sm font-semibold disabled:opacity-40"
            >
              {editMatch ? (submitting ? '수정 중...' : '수정 완료') : (submitting ? '등록 중...' : '등록 완료')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/admin/MatchRegisterWizard.tsx
git commit -m "feat: add dark mode classes to MatchRegisterWizard"
```

---

## Task 13: Build check

**Files:** none

- [ ] **Step 1: Run the build**

```bash
npm run build 2>&1 | tail -15
```

Expected: build succeeds with no TypeScript errors. If there are errors, fix them before proceeding.

- [ ] **Step 2: If build passes, commit any fixes and wrap up**

If Task 13 produces no errors, the implementation is complete. If there are TypeScript errors, fix the specific file(s) indicated, re-run the build, and commit the fix.

---

## Self-Review

**Spec coverage check:**

| Requirement | Covered in Task |
|---|---|
| Tailwind v4 `@custom-variant dark` | Task 1 |
| ThemeContext with localStorage | Task 2 |
| ThemeProvider wrapping App | Task 3 |
| Layout dark bg | Task 4 |
| Header dark bg + toggle button | Task 4 |
| HomePage dark variants | Task 5 |
| SchedulePage dark variants | Task 6 |
| MatchDetailPage dark variants | Task 7 |
| RankingsPage dark variants | Task 8 |
| JerseyIcon SVG in rankings | Task 8 |
| MyPage dark variants | Task 9 |
| LoginPage dark variants | Task 10 |
| PendingPage dark variants | Task 10 |
| RegisterPage dark variants | Task 10 |
| AdminHomePage dark variants | Task 11 |
| AdminMatchesPage dark variants | Task 11 |
| AdminMembersPage dark variants | Task 11 |
| MatchRegisterWizard dark variants | Task 12 |
| Build check | Task 13 |

**Placeholder scan:** All steps contain actual code. No TBD/TODO items.

**Type consistency:** `useTheme()` returns `{ theme: Theme; toggle: () => void }`. Used as `const { theme, toggle } = useTheme()` in Header (Task 4) and `const { theme } = useTheme()` in RankingsPage (Task 8). Both consistent with the context definition in Task 2.
