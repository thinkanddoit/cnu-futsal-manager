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
            <h2 className="font-bold text-lg dark:text-white">경기 삭제</h2>
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
          <h1 className="text-xl font-bold dark:text-white">경기 관리</h1>
          <button
            onClick={() => setShowWizard(true)}
            className="bg-blue-900 dark:bg-amber-500 text-white text-sm px-4 py-2 rounded-lg font-semibold"
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
            className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
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
          <span className="font-semibold dark:text-white">{filterYear}년 {filterMonth}월</span>
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
              <p className="font-semibold dark:text-white">
                {match.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                {match.time && <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">{match.time}</span>}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {match.venue} · <span className="font-medium">{STATUS_LABELS[match.status]}</span>
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setEditMatch(match)}
                  className="text-sm px-3 py-1 rounded-full font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                >
                  수정
                </button>
                <button
                  onClick={() => setDeleteTarget(match)}
                  className="text-sm px-3 py-1 rounded-full font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
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
