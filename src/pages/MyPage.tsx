import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getUserStats } from '../services/userStats'
import { getUserAttendances } from '../services/attendances'
import { getMatchesByMonth } from '../services/matches'
import { UserStats, Attendance, Match } from '../types'
import { signOut } from '../services/auth'
import { useNavigate } from 'react-router-dom'

export default function MyPage() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [recentAttendances, setRecentAttendances] = useState<(Attendance & { match?: Match })[]>([])

  useEffect(() => {
    if (!appUser) return
    getUserStats(appUser.uid).then(setStats)

    const now = new Date()
    Promise.all([
      getUserAttendances(appUser.uid),
      getMatchesByMonth(now.getFullYear(), now.getMonth() + 1),
      getMatchesByMonth(now.getFullYear(), now.getMonth() === 0 ? 12 : now.getMonth()),
    ]).then(([attendances, thisMonth, lastMonth]) => {
      const matchMap = Object.fromEntries([...thisMonth, ...lastMonth].map((m) => [m.id, m]))
      setRecentAttendances(
        attendances
          .map((a) => ({ ...a, match: matchMap[a.matchId] }))
          .filter((a) => a.match)
          .sort((a, b) => (b.match!.date.getTime()) - (a.match!.date.getTime()))
          .slice(0, 10)
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
      <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
        {appUser.profileImage && (
          <img src={appUser.profileImage} alt="" className="w-14 h-14 rounded-full object-cover" />
        )}
        <div>
          <p className="font-bold text-lg">{appUser.name}</p>
          <p className="text-sm text-gray-400">{appUser.role === 'admin' ? '운영진' : '일반회원'}</p>
        </div>
        <button onClick={handleSignOut} className="ml-auto text-sm text-gray-400 underline">로그아웃</button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '총점', value: stats.totalPoints },
            { label: '출석', value: stats.attendanceCount },
            { label: 'MVP', value: stats.mvp1st + stats.mvp2nd + stats.mvp3rd },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-lg shadow p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-2">최근 참석 내역</h2>
        <ul className="space-y-2">
          {recentAttendances.map((a) => (
            <li key={a.matchId} className="bg-white rounded p-3 shadow-sm flex justify-between items-center">
              <span className="text-sm">
                {a.match?.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
              </span>
              <span className={`text-sm font-medium ${a.status === 'attending' ? 'text-green-600' : 'text-gray-400'}`}>
                {a.status === 'attending' ? '참석' : '불참'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
