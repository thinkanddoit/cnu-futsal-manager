import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { updateUserName } from '../services/users'

export default function RegisterPage() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || !appUser) return
    if (trimmed.length < 2) {
      setError('이름은 2자 이상 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      await updateUserName(appUser.uid, trimmed)
      navigate('/pending', { replace: true })
    } catch {
      setError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <h1 className="text-2xl font-bold dark:text-white">환영합니다!</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm text-center">정확한 명단 관리를 위해 꼭 실명으로 입력해주세요.<br/>실명이 아닐 경우 승인이 거절될 수 있습니다.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-xs">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="실명 입력 (예: 홍길동)"
          className="border dark:border-gray-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          maxLength={20}
          autoFocus
        />
        {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={!name.trim() || loading}
          className="bg-blue-900 dark:bg-amber-500 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
        >
          {loading ? '저장 중...' : '완료'}
        </button>
      </form>
    </div>
  )
}
