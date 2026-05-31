import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginWithNamePassword, wakeUpServer } from '../services/auth'
import { useAuth } from '../hooks/useAuth'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

export default function LoginPage() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { appUser } = useAuth()
  const wakeUpPromise = useRef<Promise<void> | null>(null)

  // 페이지 로드 즉시 서버 wake-up 시작
  useEffect(() => {
    wakeUpPromise.current = wakeUpServer()
  }, [])

  useEffect(() => {
    if (appUser) {
      navigate(appUser.role === 'pending' ? '/pending' : '/', { replace: true })
    }
  }, [appUser, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !password) return
    setError('')
    setLoading(true)
    try {
      await wakeUpPromise.current
      await loginWithNamePassword(name.trim(), password)
    } catch (e: any) {
      if (e?.message === 'user_not_found') {
        setError('등록되지 않은 이름입니다.')
      } else {
        setError('비밀번호가 올바르지 않습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <h1 className="text-2xl font-bold dark:text-white">CNU 풋살</h1>
      {error && (
        <div className="text-sm text-center space-y-1">
          <p className="text-red-500 dark:text-red-400">{error}</p>
          {error === '등록되지 않은 이름입니다.' ? (
            <p className="text-gray-400 dark:text-gray-500">운영진에게 회원 등록을 요청하세요.</p>
          ) : (
            <p className="text-gray-400 dark:text-gray-500">비밀번호를 모르겠다면 운영진에게 초기화를 요청하세요.</p>
          )}
        </div>
      )}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-xs">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            className="border dark:border-gray-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            autoComplete="name"
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="PIN (4자리)"
            maxLength={4}
            pattern="[0-9]*"
            inputMode="numeric"
            className="border dark:border-gray-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            autoComplete="current-password"
          />
          <button
            type="submit"
            disabled={!name.trim() || !password}
            className="bg-blue-900 dark:bg-amber-500 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            로그인
          </button>
        </form>
      )}
    </div>
  )
}
