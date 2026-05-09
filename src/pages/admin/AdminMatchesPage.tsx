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

  async function handleStatusChange(matchId: string, next: MatchStatus) {
    await updateMatchStatus(matchId, next)
    if (next === 'completed') {
      triggerMatchTally(matchId).catch(console.error)
    }
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
  )
}
