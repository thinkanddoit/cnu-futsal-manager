import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { UserRole } from '../../types'

interface Props {
  children: React.ReactNode
  requiredRole?: UserRole | UserRole[]
}

export function ProtectedRoute({ children, requiredRole }: Props) {
  const { appUser, loading } = useAuth()

  if (loading) return <div className="flex justify-center p-8">로딩 중...</div>

  if (!appUser) return <Navigate to="/login" replace />

  if (appUser.role === 'pending') return <Navigate to="/pending" replace />

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!roles.includes(appUser.role)) return <Navigate to="/" replace />
  }

  return <>{children}</>
}
