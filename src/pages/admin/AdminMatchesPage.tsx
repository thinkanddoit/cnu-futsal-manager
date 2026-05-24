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
