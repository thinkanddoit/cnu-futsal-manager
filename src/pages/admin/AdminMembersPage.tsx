import { useEffect, useState } from 'react'
import { getAllMembers, setUserRole } from '../../services/users'
import { useAuth } from '../../hooks/useAuth'
import { AppUser, UserRole } from '../../types'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

const ROLE_LABELS: Record<string, string> = {
  member: '일반회원',
  admin: '운영진',
}

export default function AdminMembersPage() {
  const { appUser } = useAuth()
  const [members, setMembers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllMembers().then(setMembers).finally(() => setLoading(false))
  }, [])

  async function handleRoleChange(member: AppUser, role: UserRole) {
    const label = ROLE_LABELS[role]
    if (!confirm(`${member.name}님을 ${label}으로 변경하시겠습니까?`)) return
    await setUserRole(member.uid, role)
    setMembers((prev) => prev.map((m) => (m.uid === member.uid ? { ...m, role } : m)))
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold dark:text-white">회원 관리</h1>
      <ul className="space-y-3">
        {members.map((member) => {
          const isSelf = member.uid === appUser?.uid
          return (
            <li key={member.uid} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold dark:text-white">{member.name} {isSelf && <span className="text-xs text-blue-900 dark:text-amber-400">(나)</span>}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{ROLE_LABELS[member.role] ?? member.role}</p>
              </div>
              {isSelf ? (
                <span className="text-xs text-gray-300 dark:text-gray-600">변경 불가</span>
              ) : (
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member, e.target.value as UserRole)}
                  className="text-sm border dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700 dark:text-white"
                >
                  <option value="member">일반회원</option>
                  <option value="admin">운영진</option>
                </select>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
