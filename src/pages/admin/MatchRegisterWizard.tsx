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
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
          <h2 className="font-bold text-lg dark:text-white">{editMatch ? '경기 수정' : '경기 등록'}</h2>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 text-2xl leading-none">×</button>
        </div>

        {/* 단계 표시 */}
        <div className="flex gap-2 px-4 py-3">
          {(['기본정보', '참석자', 'MOM'] as const).map((label, i) => (
            <div
              key={label}
              className={`flex-1 text-center text-xs py-1.5 rounded-md font-medium ${
                step === i + 1
                  ? 'bg-blue-900 dark:bg-amber-500 text-white'
                  : step > i + 1
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
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
                  className="w-full border dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200 block mb-1">시간</label>
                <input
                  type="time"
                  value={basicInfo.time}
                  onChange={(e) => setBasicInfo((p) => ({ ...p, time: e.target.value }))}
                  className="w-full border dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
                {timeHistory.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {timeHistory.map((t) => (
                      <button
                        key={t}
                        onClick={() => setBasicInfo((p) => ({ ...p, time: t }))}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          basicInfo.time === t
                            ? 'bg-blue-900 dark:bg-amber-500 text-white border-blue-900 dark:border-amber-500'
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
                  className="w-full border dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
                {venueHistory.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {venueHistory.map((v) => (
                      <button
                        key={v}
                        onClick={() => setBasicInfo((p) => ({ ...p, venue: v }))}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          basicInfo.venue === v
                            ? 'bg-blue-900 dark:bg-amber-500 text-white border-blue-900 dark:border-amber-500'
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
                  <span className="text-sm font-semibold text-blue-900 dark:text-amber-400">{totalCount}명</span>
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
                            ? 'border-blue-900 dark:border-amber-500 bg-blue-50 dark:bg-amber-900/20 font-semibold dark:text-white'
                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200'
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
                              ? 'border-yellow-400 dark:border-amber-400 bg-yellow-50 dark:bg-amber-900/20 font-semibold dark:text-white'
                              : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200'
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
                    className={`flex-1 border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${guestError ? 'border-red-400' : ''}`}
                  />
                  <button
                    onClick={addGuest}
                    disabled={!guestInput.trim()}
                    className="bg-blue-900 dark:bg-amber-500 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-40"
                  >
                    추가
                  </button>
                </div>
                {guestError && (
                  <p className="text-red-500 text-xs mt-1">{guestError}</p>
                )}
                <div className="mt-2 space-y-1.5">
                  {guests.map((g) => (
                    <div key={g} className="flex items-center justify-between bg-yellow-50 dark:bg-amber-900/20 border border-yellow-200 dark:border-amber-800 rounded-lg px-3 py-2 text-sm dark:text-gray-200">
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
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center text-sm text-blue-900 dark:text-blue-300">
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
                          <span className="font-semibold text-sm dark:text-white">{label}</span>
                          {mom[rank].length > 0 && (
                            <span className="text-xs bg-blue-100 dark:bg-amber-900/30 text-blue-900 dark:text-amber-300 px-2 py-0.5 rounded-full">
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
                                      ? 'border-yellow-400 bg-yellow-50 font-bold dark:bg-amber-900/20 dark:text-white'
                                      : rank === 'second'
                                      ? 'border-gray-400 bg-gray-100 dark:bg-gray-600 font-bold dark:text-white'
                                      : 'border-amber-600 bg-amber-50 dark:bg-amber-900/20 font-bold dark:text-white'
                                    : takenByOther
                                    ? 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600'
                                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200'
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
            className="flex-1 py-2.5 rounded-lg border dark:border-gray-600 text-sm font-medium dark:text-gray-200"
          >
            {step === 1 ? '취소' : '← 이전'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              disabled={step === 1 ? !step1Valid : !step2Valid}
              className="flex-[2] py-2.5 rounded-lg bg-blue-900 dark:bg-amber-500 text-white text-sm font-semibold disabled:opacity-40"
            >
              다음 →
            </button>
          ) : (
            <button
              onClick={editMatch ? handleEditSubmit : handleSubmit}
              disabled={submitting}
              className="flex-[2] py-2.5 rounded-lg bg-blue-900 dark:bg-amber-500 text-white text-sm font-semibold disabled:opacity-40"
            >
              {editMatch ? (submitting ? '수정 중...' : '수정 완료') : (submitting ? '등록 중...' : '등록 완료')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
