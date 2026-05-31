import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { calculateUserStats } from '../services/userStats'
import { getUserAttendances } from '../services/attendances'
import { getAllMatches } from '../services/matches'
import { UserStats, Attendance, Match } from '../types'
import { signOut } from '../services/auth'
import { useNavigate, useLocation } from 'react-router-dom'

export default function MyPage() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [recentAttendances, setRecentAttendances] = useState<(Attendance & { match?: Match })[]>([])
  const pwChanged = location.state?.pwChanged === true

  useEffect(() => {
    if (!appUser) return
    calculateUserStats(appUser.uid).then(setStats)

    Promise.all([
      getUserAttendances(appUser.uid),
      getAllMatches(),
    ]).then(([attendances, allMatches]) => {
      const matchMap = Object.fromEntries(allMatches.map((m) => [m.id, m]))
      setRecentAttendances(
        attendances
          .filter((a) => a.status === 'attending')
          .map((a) => ({ ...a, match: matchMap[a.matchId] }))
          .filter((a) => a.match)
          .sort((a, b) => b.match!.date.getTime() - a.match!.date.getTime())
      )
    })
  }, [appUser])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  if (!appUser) return null

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4 flex items-center gap-4">
        <div>
          <p className="font-bold text-lg dark:text-white">{appUser.name}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">{appUser.role === 'admin' ? '운영진' : '일반회원'}</p>
        </div>
        <button onClick={handleSignOut} className="ml-auto text-sm text-gray-400 dark:text-gray-500 underline">로그아웃</button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '총점', value: stats.totalPoints },
            { label: '출석', value: stats.attendanceCount },
            { label: 'MOM', value: stats.mom1st + stats.mom2nd + stats.mom3rd },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-3 text-center">
              <p className="text-2xl font-bold text-blue-900 dark:text-amber-400">{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate('/mypage/change-password')}
        className="w-full bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4 flex items-center justify-between text-left"
      >
        <span className="text-sm font-medium dark:text-white">비밀번호 변경</span>
        <span className="text-gray-400">›</span>
      </button>
      {pwChanged && (
        <p className="text-green-600 dark:text-green-400 text-sm text-center">비밀번호가 변경되었습니다.</p>
      )}

      <div>
        <h2 className="font-semibold mb-2 dark:text-white">최근 참석 내역</h2>
        <ul className="space-y-2">
          {recentAttendances.map((a) => {
            const isCompleted = a.match?.status === 'completed'
            return (
              <li key={a.matchId} className="bg-white dark:bg-gray-800 rounded p-3 shadow-sm dark:shadow-none dark:ring-1 dark:ring-gray-700 flex justify-between items-center">
                <div>
                  <p className="text-sm dark:text-gray-300">
                    {a.match?.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{a.match?.venue}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  isCompleted
                    ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    : 'bg-blue-50 text-blue-700 dark:bg-amber-900/30 dark:text-amber-300'
                }`}>
                  {isCompleted ? '완료' : '참여 예정'}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
