import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getMatchesByMonth } from '../services/matches'
import { Match } from '../types'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

const STATUS_LABEL: Record<string, string> = {
  voting: '신청 중',
  confirmed: '확정',
  cancelled: '취소',
  completed: '종료',
}

const STATUS_COLOR: Record<string, string> = {
  voting: 'bg-red-100 text-red-700 dark:bg-amber-900/30 dark:text-amber-300',
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  completed: 'bg-gray-100 text-gray-600 dark:bg-purple-900/30 dark:text-purple-300',
  mom_voting: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
}

function getStatusKey(match: Match): string {
  if (
    match.status === 'completed' &&
    !match.voteTallied &&
    match.voteDeadline &&
    match.voteDeadline > new Date()
  ) return 'mom_voting'
  return match.status
}

function getStatusLabel(match: Match): string {
  if (getStatusKey(match) === 'mom_voting') return 'MOM 투표중'
  return STATUS_LABEL[match.status]
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
        <button onClick={prevMonth} disabled={isAtMin} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 dark:text-white disabled:opacity-30">‹</button>
        <h1 className="text-xl font-bold dark:text-white">{year}년 {month}월</h1>
        <button onClick={nextMonth} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 dark:text-white">›</button>
      </div>

      {loading ? (
        <LoadingSpinner />
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
                    <p className="font-semibold dark:text-white">
                      {match.date.toLocaleDateString('ko-KR', {
                        month: 'long', day: 'numeric', weekday: 'short',
                      })}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{match.venue}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[getStatusKey(match)]}`}>
                    {getStatusLabel(match)}
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
