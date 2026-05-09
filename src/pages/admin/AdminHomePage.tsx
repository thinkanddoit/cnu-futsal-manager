import { useEffect, useState } from 'react'
import { getPendingUsers, approveUser } from '../../services/users'
import { AppUser } from '../../types'

export default function AdminHomePage() {
  const [pending, setPending] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const users = await getPendingUsers()
    setPending(users)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleApprove(uid: string) {
    await approveUser(uid)
    setPending((prev) => prev.filter((u) => u.uid !== uid))
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">가입 승인 대기</h1>
      {loading ? (
        <p className="text-center text-gray-400">로딩 중...</p>
      ) : pending.length === 0 ? (
        <p className="text-gray-400 text-sm">대기 중인 가입 신청이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((user) => (
            <li key={user.uid} className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
              {user.profileImage && (
                <img src={user.profileImage} alt="" className="w-10 h-10 rounded-full object-cover" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{user.name}</p>
                <p className="text-xs text-gray-400">
                  가입 신청: {user.createdAt.toLocaleDateString('ko-KR')}
                </p>
              </div>
              <button
                onClick={() => handleApprove(user.uid)}
                className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-full"
              >
                승인
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
