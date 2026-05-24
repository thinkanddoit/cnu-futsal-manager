# 사후(수동) 경기 등록 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운영진이 경기 날짜·시간·장소·참석자·MVP를 3단계 Wizard로 수동 등록하는 기능 구현

**Architecture:** AdminMatchesPage에 "경기 등록" 버튼 추가 → MatchRegisterWizard 컴포넌트를 조건부 렌더링(오버레이). Wizard는 3단계(기본정보→참석자→MVP)로 구성되며, 날짜/시간 기준으로 경기 전/후를 자동 판단해 MVP 처리 방식을 결정한다.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Firebase Firestore, Vitest

**Working directory:** `.worktrees/feature/implement/`

---

## 파일 맵

| 파일 | 변경 |
|------|------|
| `src/types/index.ts` | `Match`에 `time` 추가, `Attendance`에 `guestName` 추가, `MvpResult` 타입 신규 |
| `src/utils/matchTime.ts` | 신규 — `isMatchInPast(date, time)` 유틸 |
| `src/utils/matchTime.test.ts` | 신규 — 유틸 테스트 |
| `src/services/matches.ts` | `createMatch`에 `time`, `status` 파라미터 추가 |
| `src/services/attendances.ts` | `saveMatchAttendances` 함수 추가 (bulk + guest 지원) |
| `src/services/mvpResults.ts` | 신규 — MVP 결과 저장 서비스 |
| `src/pages/admin/MatchRegisterWizard.tsx` | 신규 — 3단계 Wizard 컴포넌트 |
| `src/pages/admin/AdminMatchesPage.tsx` | "경기 등록" 버튼 추가, 상태 한글화, Wizard 연결 |

---

## Task 1: 타입 업데이트

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: 타입 수정**

`src/types/index.ts`에서 아래 내용으로 변경:

```typescript
export type UserRole = 'pending' | 'member' | 'admin'

export interface AppUser {
  uid: string
  name: string
  kakaoId: string
  profileImage: string
  role: UserRole
  createdAt: Date
  nameConfirmed: boolean
}

export type MatchStatus = 'voting' | 'confirmed' | 'cancelled' | 'completed'

export interface Match {
  id: string
  date: Date
  time: string        // "HH:MM" 형식
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
  userId: string | null   // 비회원은 null
  guestName?: string      // 비회원 이름
  status: AttendanceStatus
  updatedAt: Date
}

export interface MvpResult {
  matchId: string
  first: string[]    // uid 또는 guestName 배열
  second: string[]
  third: string[]    // 빈 배열 허용
  createdAt: Date
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

- [ ] **Step 2: 타입 에러 확인**

```bash
cd .worktrees/feature/implement && npx tsc --noEmit 2>&1 | head -30
```

`matches.ts`의 `docToMatch`에서 `time` 필드 에러가 날 것. 다음 Task에서 수정.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: update Match/Attendance/MvpResult types for manual registration"
```

---

## Task 2: isMatchInPast 유틸 (TDD)

**Files:**
- Create: `src/utils/matchTime.ts`
- Create: `src/utils/matchTime.test.ts`

- [ ] **Step 1: 테스트 작성**

`src/utils/matchTime.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { isMatchInPast } from './matchTime'

describe('isMatchInPast', () => {
  it('날짜와 시간이 현재보다 과거면 true', () => {
    expect(isMatchInPast('2020-01-01', '10:00')).toBe(true)
  })

  it('날짜와 시간이 현재보다 미래면 false', () => {
    expect(isMatchInPast('2099-12-31', '23:59')).toBe(false)
  })

  it('오늘 날짜라도 시간이 지났으면 true', () => {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    expect(isMatchInPast(dateStr, '00:00')).toBe(true)
  })

  it('오늘 날짜라도 시간이 안 지났으면 false', () => {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    expect(isMatchInPast(dateStr, '23:59')).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
cd .worktrees/feature/implement && npx vitest run src/utils/matchTime.test.ts
```

Expected: `Error: Failed to resolve import "./matchTime"`

- [ ] **Step 3: 구현**

`src/utils/matchTime.ts`:

```typescript
export function isMatchInPast(dateStr: string, timeStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)
  const matchDate = new Date(year, month - 1, day, hour, minute)
  return matchDate <= new Date()
}
```

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```bash
cd .worktrees/feature/implement && npx vitest run src/utils/matchTime.test.ts
```

Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add src/utils/matchTime.ts src/utils/matchTime.test.ts
git commit -m "feat: add isMatchInPast utility"
```

---

## Task 3: matches 서비스 업데이트

**Files:**
- Modify: `src/services/matches.ts`

- [ ] **Step 1: docToMatch에 time 추가 + createMatch 시그니처 변경**

`src/services/matches.ts`의 `docToMatch`와 `createMatch`를 수정:

```typescript
function docToMatch(id: string, data: Record<string, any>): Match {
  return {
    id,
    date: data.date?.toDate() ?? new Date(),
    time: data.time ?? '',
    venue: data.venue,
    status: data.status as MatchStatus,
    confirmedAt: data.confirmedAt?.toDate() ?? null,
    voteDeadline: data.voteDeadline?.toDate() ?? null,
    voteTallied: data.voteTallied ?? false,
    createdBy: data.createdBy,
  }
}

export async function createMatch(
  date: Date,
  time: string,
  venue: string,
  createdBy: string,
  status: MatchStatus = 'voting'
): Promise<string> {
  const ref = await addDoc(collection(db, 'matches'), {
    date: Timestamp.fromDate(date),
    time,
    venue,
    status,
    confirmedAt: status === 'confirmed' ? Timestamp.now() : null,
    voteDeadline: null,
    voteTallied: false,
    createdBy,
  })
  return ref.id
}
```

- [ ] **Step 2: 타입 에러 확인**

```bash
cd .worktrees/feature/implement && npx tsc --noEmit 2>&1 | head -20
```

`AdminMatchesPage.tsx`에서 `createMatch` 호출 시그니처 에러 날 것. Task 8에서 수정.

- [ ] **Step 3: Commit**

```bash
git add src/services/matches.ts
git commit -m "feat: update createMatch to accept time and status"
```

---

## Task 4: attendances 서비스 업데이트

**Files:**
- Modify: `src/services/attendances.ts`

- [ ] **Step 1: saveMatchAttendances 함수 추가**

`src/services/attendances.ts` 파일 끝에 추가:

```typescript
export interface AttendeeInput {
  userId: string | null
  guestName?: string
}

export async function saveMatchAttendances(
  matchId: string,
  attendees: AttendeeInput[]
): Promise<void> {
  const writes = attendees.map((a) => {
    const docData: Record<string, any> = {
      matchId,
      userId: a.userId,
      status: 'attending' as AttendanceStatus,
      updatedAt: Timestamp.now(),
    }
    if (a.guestName) docData.guestName = a.guestName

    if (a.userId) {
      return setDoc(doc(db, 'attendances', attendanceId(matchId, a.userId)), docData)
    } else {
      return addDoc(collection(db, 'attendances'), docData)
    }
  })
  await Promise.all(writes)
}
```

`addDoc`을 import에 추가:

```typescript
import {
  doc,
  setDoc,
  addDoc,
  getDocs,
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore'
```

- [ ] **Step 2: 타입 에러 확인**

```bash
cd .worktrees/feature/implement && npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음 (또는 다른 파일 에러만)

- [ ] **Step 3: Commit**

```bash
git add src/services/attendances.ts
git commit -m "feat: add saveMatchAttendances with guest support"
```

---

## Task 5: mvpResults 서비스 신규 생성

**Files:**
- Create: `src/services/mvpResults.ts`

- [ ] **Step 1: 서비스 파일 생성**

`src/services/mvpResults.ts`:

```typescript
import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { MvpResult } from '../types'

export async function saveMvpResult(
  matchId: string,
  first: string[],
  second: string[],
  third: string[]
): Promise<void> {
  await addDoc(collection(db, 'mvpResults'), {
    matchId,
    first,
    second,
    third,
    createdAt: Timestamp.now(),
  })
}

export async function getMvpResult(matchId: string): Promise<MvpResult | null> {
  const q = query(collection(db, 'mvpResults'), where('matchId', '==', matchId))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const data = snap.docs[0].data()
  return {
    matchId: data.matchId,
    first: data.first,
    second: data.second,
    third: data.third,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  }
}
```

- [ ] **Step 2: 타입 에러 확인**

```bash
cd .worktrees/feature/implement && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/services/mvpResults.ts
git commit -m "feat: add mvpResults service"
```

---

## Task 6: MatchRegisterWizard 컴포넌트

**Files:**
- Create: `src/pages/admin/MatchRegisterWizard.tsx`

- [ ] **Step 1: Wizard 컴포넌트 생성**

`src/pages/admin/MatchRegisterWizard.tsx`:

```typescript
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getAllMembers } from '../../services/users'
import { createMatch } from '../../services/matches'
import { saveMatchAttendances, AttendeeInput } from '../../services/attendances'
import { saveMvpResult } from '../../services/mvpResults'
import { isMatchInPast } from '../../utils/matchTime'
import { AppUser } from '../../types'

interface Props {
  onClose: () => void
  onComplete: () => void
}

interface BasicInfo {
  date: string
  time: string
  venue: string
}

interface MvpSelections {
  first: string[]
  second: string[]
  third: string[]
}

export default function MatchRegisterWizard({ onClose, onComplete }: Props) {
  const { appUser } = useAuth()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [members, setMembers] = useState<AppUser[]>([])
  const [basicInfo, setBasicInfo] = useState<BasicInfo>({ date: '', time: '', venue: '' })
  const [selectedUids, setSelectedUids] = useState<string[]>([])
  const [guests, setGuests] = useState<string[]>([])
  const [guestInput, setGuestInput] = useState('')
  const [mvp, setMvp] = useState<MvpSelections>({ first: [], second: [], third: [] })
  const [submitting, setSubmitting] = useState(false)

  const totalCount = selectedUids.length + guests.length
  const isPast = basicInfo.date && basicInfo.time
    ? isMatchInPast(basicInfo.date, basicInfo.time)
    : false

  useEffect(() => {
    getAllMembers().then(setMembers)
  }, [])

  function toggleMember(uid: string) {
    if (selectedUids.includes(uid)) {
      setSelectedUids((prev) => prev.filter((u) => u !== uid))
    } else if (totalCount < 16) {
      setSelectedUids((prev) => [...prev, uid])
    }
  }

  function addGuest() {
    const name = guestInput.trim()
    if (!name || guests.includes(name) || totalCount >= 16) return
    setGuests((prev) => [...prev, name])
    setGuestInput('')
  }

  function removeGuest(name: string) {
    setGuests((prev) => prev.filter((g) => g !== name))
  }

  function toggleMvpSelection(rank: keyof MvpSelections, id: string) {
    const allSelected = [...mvp.first, ...mvp.second, ...mvp.third]
    const isInOtherRank = allSelected.includes(id) && !mvp[rank].includes(id)
    if (isInOtherRank) return

    setMvp((prev) => ({
      ...prev,
      [rank]: prev[rank].includes(id)
        ? prev[rank].filter((x) => x !== x)  // remove — placeholder fixed below
        : [...prev[rank], id],
    }))
  }

  function toggleMvp(rank: keyof MvpSelections, id: string) {
    const otherRanks = (['first', 'second', 'third'] as (keyof MvpSelections)[]).filter((r) => r !== rank)
    const inOther = otherRanks.some((r) => mvp[r].includes(id))
    if (inOther) return
    setMvp((prev) => ({
      ...prev,
      [rank]: prev[rank].includes(id)
        ? prev[rank].filter((x) => x !== id)
        : [...prev[rank], id],
    }))
  }

  function isTakenByOther(rank: keyof MvpSelections, id: string) {
    return (['first', 'second', 'third'] as (keyof MvpSelections)[])
      .filter((r) => r !== rank)
      .some((r) => mvp[r].includes(id))
  }

  function getRankLabel(id: string): string | null {
    if (mvp.first.includes(id)) return '1등'
    if (mvp.second.includes(id)) return '2등'
    if (mvp.third.includes(id)) return '3등'
    return null
  }

  const allAttendees = [
    ...members.filter((m) => selectedUids.includes(m.uid)).map((m) => ({ id: m.uid, label: m.name })),
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

      const attendees: AttendeeInput[] = [
        ...selectedUids.map((uid) => ({ userId: uid })),
        ...guests.map((g) => ({ userId: null, guestName: g })),
      ]
      await saveMatchAttendances(matchId, attendees)

      if (isPast && (mvp.first.length > 0 || mvp.second.length > 0)) {
        await saveMvpResult(matchId, mvp.first, mvp.second, mvp.third)
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
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-bold text-lg">경기 등록</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        {/* 단계 표시 */}
        <div className="flex gap-2 px-4 py-3">
          {(['기본정보', '참석자', 'MVP'] as const).map((label, i) => (
            <div
              key={label}
              className={`flex-1 text-center text-xs py-1.5 rounded-md font-medium ${
                step === i + 1
                  ? 'bg-blue-600 text-white'
                  : step > i + 1
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-400'
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
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">날짜</label>
                <input
                  type="date"
                  value={basicInfo.date}
                  onChange={(e) => setBasicInfo((p) => ({ ...p, date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">시간</label>
                <input
                  type="time"
                  value={basicInfo.time}
                  onChange={(e) => setBasicInfo((p) => ({ ...p, time: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">경기장</label>
                <input
                  type="text"
                  placeholder="예: CNU 실내 체육관"
                  value={basicInfo.venue}
                  onChange={(e) => setBasicInfo((p) => ({ ...p, venue: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm"
                />
              </div>
            </div>
          )}

          {/* Step 2: 참석자 */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">회원</span>
                <span className={`text-sm font-semibold ${totalCount >= 16 ? 'text-red-500' : 'text-blue-600'}`}>
                  {totalCount} / 16명
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {members.map((m) => {
                  const selected = selectedUids.includes(m.uid)
                  const disabled = !selected && totalCount >= 16
                  return (
                    <button
                      key={m.uid}
                      onClick={() => toggleMember(m.uid)}
                      disabled={disabled}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm text-left transition-colors ${
                        selected
                          ? 'border-blue-500 bg-blue-50 font-semibold'
                          : disabled
                          ? 'border-gray-200 bg-gray-50 text-gray-300'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      {selected ? '✓' : '○'} {m.name}
                    </button>
                  )
                })}
              </div>

              <div className="border-t pt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">비회원 추가</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={guestInput}
                    onChange={(e) => setGuestInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                    placeholder="이름 입력"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    disabled={totalCount >= 16}
                  />
                  <button
                    onClick={addGuest}
                    disabled={!guestInput.trim() || totalCount >= 16}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-40"
                  >
                    추가
                  </button>
                </div>
                <div className="mt-2 space-y-1.5">
                  {guests.map((g) => (
                    <div key={g} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm">
                      <span>{g} <span className="text-xs text-yellow-700">(비회원)</span></span>
                      <button onClick={() => removeGuest(g)} className="text-red-400 text-lg leading-none">×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: MVP */}
          {step === 3 && (
            <div className="space-y-4">
              {!isPast ? (
                <div className="bg-blue-50 rounded-xl p-4 text-center text-sm text-blue-700">
                  <p className="text-2xl mb-2">🗳️</p>
                  <p className="font-semibold">경기 완료 후 참석자 투표로</p>
                  <p>MVP가 자동 선정됩니다.</p>
                </div>
              ) : (
                <>
                  {(['first', 'second', 'third'] as (keyof MvpSelections)[]).map((rank, i) => {
                    const emoji = ['🥇', '🥈', '🥉'][i]
                    const label = ['1등', '2등', '3등'][i]
                    return (
                      <div key={rank}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{emoji}</span>
                          <span className="font-semibold text-sm">{label}</span>
                          {mvp[rank].length > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              {mvp[rank].length}명
                            </span>
                          )}
                          {rank === 'third' && (
                            <span className="text-xs text-gray-400 ml-auto">선택 안 해도 됨</span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {allAttendees.map(({ id, label: name }) => {
                            const selected = mvp[rank].includes(id)
                            const takenByOther = isTakenByOther(rank, id)
                            const takenLabel = getRankLabel(id)
                            return (
                              <button
                                key={id}
                                onClick={() => toggleMvp(rank, id)}
                                disabled={takenByOther}
                                className={`p-2 rounded-lg border text-xs text-center transition-colors ${
                                  selected
                                    ? rank === 'first'
                                      ? 'border-yellow-400 bg-yellow-50 font-bold'
                                      : rank === 'second'
                                      ? 'border-gray-400 bg-gray-100 font-bold'
                                      : 'border-amber-600 bg-amber-50 font-bold'
                                    : takenByOther
                                    ? 'border-gray-100 bg-gray-50 text-gray-300'
                                    : 'border-gray-200 bg-white'
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
        <div className="flex gap-2 px-4 py-3 border-t">
          <button
            onClick={() => step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : onClose()}
            className="flex-1 py-2.5 rounded-lg border text-sm font-medium"
          >
            {step === 1 ? '취소' : '← 이전'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              disabled={step === 1 ? !step1Valid : !step2Valid}
              className="flex-2 flex-[2] py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-40"
            >
              다음 →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-[2] py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-40"
            >
              {submitting ? '등록 중...' : '등록 완료'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 타입 에러 확인**

```bash
cd .worktrees/feature/implement && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/MatchRegisterWizard.tsx
git commit -m "feat: add MatchRegisterWizard 3-step component"
```

---

## Task 7: AdminMatchesPage 업데이트

**Files:**
- Modify: `src/pages/admin/AdminMatchesPage.tsx`

- [ ] **Step 1: 전체 파일 교체**

`src/pages/admin/AdminMatchesPage.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  subscribeToMatches,
  createMatch,
  updateMatchStatus,
  getNextMonthMondays,
} from '../../services/matches'
import { triggerMatchTally } from '../../services/stats'
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
  const [showWizard, setShowWizard] = useState(false)

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
    if (next === 'completed') {
      triggerMatchTally(matchId).catch(console.error)
    }
  }

  return (
    <>
      {showWizard && (
        <MatchRegisterWizard
          onClose={() => setShowWizard(false)}
          onComplete={() => setShowWizard(false)}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">경기 관리</h1>
          <button
            onClick={() => setShowWizard(true)}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg font-semibold"
          >
            + 경기 등록
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <h2 className="font-semibold text-sm text-gray-600">다음 달 경기 일괄 생성</h2>
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
            className="w-full bg-gray-100 text-gray-700 rounded py-2 text-sm font-semibold disabled:opacity-50"
          >
            {creating ? '생성 중...' : '월요일 경기 일괄 생성'}
          </button>
        </div>

        <ul className="space-y-3">
          {matches.map((match) => (
            <li key={match.id} className="bg-white rounded-lg shadow p-4">
              <p className="font-semibold">
                {match.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                {match.time && <span className="text-gray-500 font-normal ml-1">{match.time}</span>}
              </p>
              <p className="text-sm text-gray-500 mb-3">
                {match.venue} · <span className="font-medium">{STATUS_LABELS[match.status]}</span>
              </p>
              <div className="flex gap-2 flex-wrap">
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
      </div>
    </>
  )
}
```

- [ ] **Step 2: 전체 빌드 에러 확인**

```bash
cd .worktrees/feature/implement && npx tsc --noEmit 2>&1
```

Expected: 에러 없음

- [ ] **Step 3: 전체 테스트 통과 확인**

```bash
cd .worktrees/feature/implement && npx vitest run
```

Expected: 모든 테스트 pass

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/AdminMatchesPage.tsx
git commit -m "feat: add manual match registration wizard to AdminMatchesPage"
```

---

## Task 8: 브라우저 동작 확인

- [ ] **Step 1: 개발 서버 확인**

`http://localhost:5174/admin/matches` 접속

- [ ] **Step 2: 경기 등록 Wizard 테스트**

1. "+ 경기 등록" 버튼 클릭 → Wizard 열림 확인
2. Step 1: 과거 날짜/시간 입력 + 경기장 입력 → 다음
3. Step 2: 회원 체크 + 비회원 추가 → 다음
4. Step 3: 직접 지정 UI (1~3등 복수 선택) 확인 → 등록 완료
5. Wizard 닫힘 + 경기 목록에 새 경기 표시 확인
6. 미래 날짜로 동일 반복 → Step 3에서 투표 안내 표시 확인

- [ ] **Step 3: 상태 한글화 확인**

경기 목록에서 `voting` → "투표중", `confirmed` → "확정" 등으로 표시되는지 확인

- [ ] **Step 4: 최종 Commit**

```bash
git add -A
git commit -m "feat: complete manual match registration feature"
```
