import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { changePassword } from '../services/auth'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (currentPw.length !== 4 || newPw.length !== 4 || confirmPw.length !== 4) {
      setError('모든 PIN은 4자리여야 합니다.')
      return
    }
    if (newPw !== confirmPw) {
      setError('새 비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)
    try {
      await changePassword(currentPw, newPw)
      navigate('/mypage', { state: { pwChanged: true } })
    } catch (e: any) {
      if (e?.message === 'invalid_credentials') {
        setError('현재 비밀번호가 올바르지 않습니다.')
      } else {
        setError('변경에 실패했습니다. 다시 시도해주세요.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'border dark:border-gray-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 w-full'

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400"
      >
        ← 뒤로
      </button>

      <h1 className="text-xl font-bold dark:text-white">비밀번호 변경</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none dark:ring-1 dark:ring-gray-700 p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            placeholder="현재 PIN (4자리)"
            maxLength={4}
            inputMode="numeric"
            className={inputClass}
          />
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="새 PIN (4자리)"
            maxLength={4}
            inputMode="numeric"
            className={inputClass}
          />
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="새 PIN 확인"
            maxLength={4}
            inputMode="numeric"
            className={inputClass}
          />
          {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !currentPw || !newPw || !confirmPw}
            className="bg-blue-900 dark:bg-amber-500 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50 text-sm"
          >
            {loading ? '변경 중...' : '변경'}
          </button>
        </form>
      </div>
    </div>
  )
}
