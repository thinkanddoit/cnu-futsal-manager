import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMatchesByMonth } from '../services/matches'
import { calculateAllStats } from '../services/userStats'
import { getAllUsers } from '../services/users'
import { getUserAttendances } from '../services/attendances'
import { getMyVote } from '../services/votes'
import { useAuth } from '../hooks/useAuth'
import { Match, UserStats } from '../types'

type VotingMatch = Match & { voted: boolean }

export default function HomePage() {
  const { appUser } = useAuth()
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [votingMatches, setVotingMatches] = useState<VotingMatch[]>([])
  const [topStats, setTopStats] = useState<(UserStats & { name: string })[]>([])
  const [loadingMatches, setLoadingMatches] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    const now = new Date()
    const futureMths: { year: number; month: number }[] = []
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      futureMths.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
    }
    Promise.all(futureMths.map(({ year, month }) => getMatchesByMonth(year, month))).then((results) => {
      const upcoming = results
        .flat()
        .filter((m) => m.status !== 'completed' && m.date >= now)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 5)
      setUpcomingMatches(upcoming)
      setLoadingMatches(false)
    })

    Promise.all([calculateAllStats(), getAllUsers()]).then(([stats, users]) => {
      const memberMap = Object.fromEntries(
        users.filter((u) => u.role !== 'guest').map((m) => [m.uid, m.name])
      )
      setTopStats(
        stats
          .filter((s) => memberMap[s.userId])
          .slice(0, 5)
          .map((s) => ({ ...s, name: memberMap[s.userId] }))
      )
      setLoadingStats(false)
    })
  }, [])

  useEffect(() => {
    if (!appUser) { setVotingMatches([]); return }

    const now = new Date()
    const pastMths: { year: number; month: number }[] = []
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      pastMths.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
    }

    Promise.all([
      Promise.all(pastMths.map(({ year, month }) => getMatchesByMonth(year, month))),
      getUserAttendances(appUser.uid),
    ]).then(async ([monthResults, attendances]) => {
      const allMatches = monthResults.flat()
      const attendedIds = new Set(
        attendances.filter((a) => a.status === 'attending').map((a) => a.matchId)
      )
      const active = allMatches.filter(
        (m) =>
          m.status === 'completed' &&
          !m.voteTallied &&
          m.voteDeadline &&
          m.voteDeadline > now &&
          attendedIds.has(m.id)
      )
      const withVoteStatus = await Promise.all(
        active.map(async (m) => {
          const vote = await getMyVote(m.id, appUser.uid)
          return { ...m, voted: vote !== null }
        })
      )
      setVotingMatches(withVoteStatus.sort((a, b) => a.date.getTime() - b.date.getTime()))
    })
  }, [appUser])

  return (
    <div className="space-y-6">
      {/* MOM 투표 배너 */}
      {votingMatches.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3 dark:text-white">MOM 투표</h2>
          <ul className="space-y-2">
            {votingMatches.map((m) => (
              <li key={m.id}>
                <Link
                  to={`/match/${m.id}`}
                  className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg p-3 hover:shadow-md"
                >
                  <div>
                    <p className="font-medium dark:text-white">
                      {m.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{m.venue}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-400 text-yellow-900 dark:bg-yellow-500 dark:text-black">
                      투표진행중
                    </span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      m.voted
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {m.voted ? '투표 완료' : '투표 전'}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-lg font-bold mb-3 dark:text-white">다가오는 경기</h2>
        {loadingMatches ? (
          <ul className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <li key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-3 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/5 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-1/3" />
              </li>
            ))}
          </ul>
        ) : upcomingMatches.length === 0 ? (
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
        {loadingStats ? (
          <ol className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <li key={i} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-3 animate-pulse">
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-10" />
              </li>
            ))}
          </ol>
        ) : (
          <ol className="space-y-2">
            {topStats.map((s, i) => (
              <li key={s.userId} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-3">
                <span className="font-bold text-gray-400 dark:text-gray-400 w-6">{i + 1}</span>
                <span className="flex-1 dark:text-gray-100">{s.name}</span>
                <span className="font-semibold text-red-600 dark:text-amber-400">{s.totalPoints}점</span>
              </li>
            ))}
          </ol>
        )}
        <Link to="/rankings" className="text-sm text-red-600 dark:text-amber-400 mt-2 inline-block">전체 랭킹 보기 →</Link>
      </section>
    </div>
  )
}
