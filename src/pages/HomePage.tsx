import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMatchesByMonth } from '../services/matches'
import { getAllUserStats } from '../services/userStats'
import { getAllMembers } from '../services/users'
import { Match, UserStats } from '../types'

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
