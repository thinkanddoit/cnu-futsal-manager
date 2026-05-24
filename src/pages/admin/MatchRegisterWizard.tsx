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
              className="flex-[2] py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-40"
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
