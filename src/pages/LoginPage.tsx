import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { redirectToKakaoLogin, loginWithKakaoCode } from '../services/auth'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { appUser } = useAuth()

  useEffect(() => {
    if (appUser) {
      navigate(appUser.role === 'pending' ? '/pending' : '/', { replace: true })
    }
  }, [appUser, navigate])

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) return

    setLoading(true)
    loginWithKakaoCode(code)
      .catch(() => setError('로그인에 실패했습니다. 다시 시도해주세요.'))
      .finally(() => setLoading(false))
  }, [searchParams])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <h1 className="text-2xl font-bold">CNU 풋살</h1>
      {error && <p className="text-red-500">{error}</p>}
      {loading ? (
        <p>로그인 중...</p>
      ) : (
        <button
          onClick={redirectToKakaoLogin}
          className="bg-yellow-400 text-black font-semibold px-6 py-3 rounded-lg hover:bg-yellow-300"
        >
          카카오로 로그인
        </button>
      )}
    </div>
  )
}
