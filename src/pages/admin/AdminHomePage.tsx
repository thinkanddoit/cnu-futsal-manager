import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPendingUsers, approveUser } from '../../services/users'
import { AppUser } from '../../types'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

export default function AdminHomePage() {
  const [pending, setPending] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const users = await getPendingUsers()
      setPending(users)
    } catch (e) {
      console.error('getPendingUsers 오류:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleApprove(user: AppUser) {
    await approveUser(user.uid, user.name)
    setPending((prev) => prev.filter((u) => u.uid !== user.uid))
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <Link to="/admin/matches" className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4 flex flex-col gap-1 active:opacity-70">
          <span className="text-2xl">⚽</span>
          <span className="font-semibold text-sm dark:text-white">경기 관리</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">일정 생성 · 상태 변경</span>
        </Link>
        <Link to="/admin/members" className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4 flex flex-col gap-1 active:opacity-70">
          <span className="text-2xl">👥</span>
          <span className="font-semibold text-sm dark:text-white">회원 관리</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">역할 변경</span>
        </Link>
      </div>

      <div>
      <h1 className="text-xl font-bold dark:text-white mb-4">가입 승인 대기</h1>
      {loading ? (
        <LoadingSpinner />
      ) : pending.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm">대기 중인 가입 신청이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((user) => (
            <li key={user.uid} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold dark:text-white">{user.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  가입 신청: {user.createdAt.toLocaleDateString('ko-KR')}
                </p>
              </div>
              <button
                onClick={() => handleApprove(user)}
                className="bg-blue-900 dark:bg-amber-500 text-white text-sm px-4 py-1.5 rounded-full"
              >
                승인
              </button>
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  )
}
