import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { calculateUserStats } from '../services/userStats'
import { getUserAttendances } from '../services/attendances'
import { getAllMatches } from '../services/matches'
import { UserStats, Attendance, Match } from '../types'
import { signOut, changePassword } from '../services/auth'
import { useNavigate } from 'react-router-dom'

export default function MyPage() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [recentAttendances, setRecentAttendances] = useState<(Attendance & { match?: Match })[]>([])

  // Password change state
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

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

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')

    if (currentPw.length !== 4 || newPw.length !== 4 || confirmPw.length !== 4) {
      setPwError('모든 PIN은 4자리여야 합니다.')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('새 비밀번호가 일치하지 않습니다.')
      return
    }

    setPwLoading(true)
    try {
      await changePassword(currentPw, newPw)
      setPwSuccess('변경되었습니다.')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (e: any) {
      if (e?.message === 'invalid_credentials') {
        setPwError('현재 비밀번호가 올바르지 않습니다.')
      } else {
        setPwError('변경에 실패했습니다. 다시 시도해주세요.')
      }
    } finally {
      setPwLoading(false)
    }
  }

  if (!appUser) return null

  const pinInputClass =
    'border dark:border-gray-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 w-full'

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

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4">
        <h2 className="font-semibold mb-3 dark:text-white">비밀번호 변경</h2>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
          <input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            placeholder="현재 PIN (4자리)"
            maxLength={4}
            pattern="[0-9]*"
            inputMode="numeric"
            className={pinInputClass}
          />
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="새 PIN (4자리)"
            maxLength={4}
            pattern="[0-9]*"
            inputMode="numeric"
            className={pinInputClass}
          />
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="새 PIN 확인"
            maxLength={4}
            pattern="[0-9]*"
            inputMode="numeric"
            className={pinInputClass}
          />
          {pwError && <p className="text-red-500 dark:text-red-400 text-sm">{pwError}</p>}
          {pwSuccess && <p className="text-green-600 dark:text-green-400 text-sm">{pwSuccess}</p>}
          <button
            type="submit"
            disabled={pwLoading || !currentPw || !newPw || !confirmPw}
            className="bg-blue-900 dark:bg-amber-500 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50 text-sm"
          >
            {pwLoading ? '변경 중...' : '변경'}
          </button>
        </form>
      </div>

      <div>
        <h2 className="font-semibold mb-2 dark:text-white">최근 참석 내역</h2>
        <ul className="space-y-2">
          {recentAttendances.map((a) => (
            <li key={a.matchId} className="bg-white dark:bg-gray-800 rounded p-3 shadow-sm dark:shadow-none dark:ring-1 dark:ring-gray-700 flex justify-between items-center">
              <span className="text-sm dark:text-gray-300">
                {a.match?.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
              </span>
              <span className={`text-sm font-medium ${a.status === 'attending' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                {a.status === 'attending' ? '참석' : '불참'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
