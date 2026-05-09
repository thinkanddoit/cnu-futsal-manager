import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { signOut } from '../../services/auth'

export function Header() {
  const { appUser } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="bg-blue-600 text-white shadow-md">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-lg font-bold">CNU 풋살</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/schedule">경기 일정</Link>
          <Link to="/rankings">랭킹</Link>
          {appUser ? (
            <>
              <Link to="/mypage">마이페이지</Link>
              {appUser.role === 'admin' && <Link to="/admin">관리</Link>}
              <button onClick={handleSignOut} className="underline">로그아웃</button>
            </>
          ) : (
            <Link to="/login">로그인</Link>
          )}
        </nav>
      </div>
    </header>
  )
}
