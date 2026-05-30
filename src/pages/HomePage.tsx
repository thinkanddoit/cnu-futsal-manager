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
    const months: { year: number; month: number }[] = []
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
    }
    Promise.all(months.map(({ year, month }) => getMatchesByMonth(year, month))).then((results) => {
      const upcoming = results
        .flat()
        .filter((m) => m.status !== 'cancelled' && m.date >= now)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 5)
      setUpcomingMatches(upcoming)
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
        <h2 className="text-lg font-bold mb-3 dark:text-white">다가오는 경기</h2>
        {upcomingMatches.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-400 text-sm">예정된 경기가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {upcomingMatches.map((m) => (
              <li key={m.id}>
                <Link to={`/match/${m.id}`} className="block bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-3 hover:shadow-md">
                  <p className="font-medium dark:text-white">
                    {m.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{m.venue}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link to="/schedule" className="text-sm text-red-600 dark:text-amber-400 mt-2 inline-block">전체 일정 보기 →</Link>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3 dark:text-white">랭킹 TOP 5</h2>
        <ol className="space-y-2">
          {topStats.map((s, i) => (
            <li key={s.userId} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-3">
              <span className="font-bold text-gray-400 dark:text-gray-400 w-6">{i + 1}</span>
              <span className="flex-1 dark:text-gray-100">{s.name}</span>
              <span className="font-semibold text-red-600 dark:text-amber-400">{s.totalPoints}점</span>
            </li>
          ))}
        </ol>
        <Link to="/rankings" className="text-sm text-red-600 dark:text-amber-400 mt-2 inline-block">전체 랭킹 보기 →</Link>
      </section>
    </div>
  )
}
