import { useEffect, useState } from 'react'
import { getAllMembers, setUserRole } from '../../services/users'
import { AppUser, UserRole } from '../../types'

export default function AdminMembersPage() {
  const [members, setMembers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllMembers().then(setMembers).finally(() => setLoading(false))
  }, [])

  async function handleRoleChange(uid: string, role: UserRole) {
    await setUserRole(uid, role)
    setMembers((prev) => prev.map((m) => (m.uid === uid ? { ...m, role } : m)))
  }

  if (loading) return <p className="text-center p-8">로딩 중...</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">회원 관리</h1>
      <ul className="space-y-3">
        {members.map((member) => (
          <li key={member.uid} className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
            {member.profileImage && (
              <img src={member.profileImage} alt="" className="w-10 h-10 rounded-full object-cover" />
            )}
            <div className="flex-1">
              <p className="font-semibold">{member.name}</p>
              <p className="text-xs text-gray-400">{member.role}</p>
            </div>
            <select
              value={member.role}
              onChange={(e) => handleRoleChange(member.uid, e.target.value as UserRole)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="member">일반회원</option>
              <option value="admin">운영진</option>
            </select>
          </li>
        ))}
      </ul>
    </div>
  )
}
