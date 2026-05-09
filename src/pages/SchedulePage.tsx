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
