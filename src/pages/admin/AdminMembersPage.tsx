import { useEffect, useState } from 'react'
import { getAllMembers, setUserRole, createMember } from '../../services/users'
import { resetMemberPassword } from '../../services/auth'
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
  const [resetStatus, setResetStatus] = useState<Record<string, string>>({})

  // New member creation state
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    getAllMembers().then(setMembers).finally(() => setLoading(false))
  }, [])

  async function handleRoleChange(member: AppUser, role: UserRole) {
    const label = ROLE_LABELS[role]
    if (!confirm(`${member.name}님을 ${label}으로 변경하시겠습니까?`)) return
    await setUserRole(member.uid, role)
    setMembers((prev) => prev.map((m) => (m.uid === member.uid ? { ...m, role } : m)))
  }

  async function handleResetPassword(member: AppUser) {
    if (!confirm(`${member.name}님의 비밀번호를 1234로 초기화하시겠습니까?`)) return
    try {
      await resetMemberPassword(member.uid)
      setResetStatus((prev) => ({ ...prev, [member.uid]: '초기화되었습니다.' }))
      setTimeout(() => setResetStatus((prev) => { const next = { ...prev }; delete next[member.uid]; return next }), 3000)
    } catch {
      setResetStatus((prev) => ({ ...prev, [member.uid]: '실패했습니다.' }))
    }
  }

  async function handleCreateMember(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    if (members.some((m) => m.name === name)) {
      setCreateError(`'${name}'은(는) 이미 존재하는 이름입니다.`)
      return
    }
    setCreateError('')
    setCreating(true)
    try {
      const uid = await createMember(name)
      const newUser: AppUser = { uid, name, role: 'member', createdAt: new Date() }
      setMembers((prev) => [...prev, newUser])
      setNewName('')
    } catch {
      setCreateError('멤버 추가에 실패했습니다.')
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <h1 className="text-xl font-bold dark:text-white">회원 관리</h1>
        <span className="text-sm text-gray-400 dark:text-gray-500">총 {members.length}명</span>
      </div>

      {/* 멤버 추가 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4">
        <h2 className="font-semibold text-sm dark:text-white mb-2">멤버 추가</h2>
        <form onSubmit={handleCreateMember} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="이름 입력"
            className="flex-1 border dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
            maxLength={20}
          />
          <button
            type="submit"
            disabled={!newName.trim() || creating}
            className="bg-blue-900 dark:bg-amber-500 text-white text-sm px-4 py-2 rounded disabled:opacity-50"
          >
            {creating ? '추가 중...' : '추가'}
          </button>
        </form>
        {createError && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{createError}</p>}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">초기 PIN: 1234</p>
      </div>

      <ul className="space-y-3">
        {members.map((member) => {
          const isSelf = member.uid === appUser?.uid
          return (
            <li key={member.uid} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold dark:text-white">{member.name} {isSelf && <span className="text-xs text-blue-900 dark:text-amber-400">(나)</span>}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{ROLE_LABELS[member.role] ?? member.role}</p>
                {resetStatus[member.uid] && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">{resetStatus[member.uid]}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isSelf && (
                  <button
                    onClick={() => handleResetPassword(member)}
                    className="text-xs text-gray-500 dark:text-gray-400 border dark:border-gray-600 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    비번 초기화
                  </button>
                )}
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
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
