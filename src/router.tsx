import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import HomePage from './pages/HomePage'
import SchedulePage from './pages/SchedulePage'
import RankingsPage from './pages/RankingsPage'
import LoginPage from './pages/LoginPage'
import PendingPage from './pages/PendingPage'
import MatchDetailPage from './pages/MatchDetailPage'
import MyPage from './pages/MyPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import AdminHomePage from './pages/admin/AdminHomePage'
import AdminMatchesPage from './pages/admin/AdminMatchesPage'
import AdminMembersPage from './pages/admin/AdminMembersPage'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/schedule', element: <SchedulePage /> },
      { path: '/rankings', element: <RankingsPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/pending', element: <PendingPage /> },
      { path: '/match/:id', element: <MatchDetailPage /> },
      {
        path: '/mypage',
        element: <ProtectedRoute><MyPage /></ProtectedRoute>,
      },
      {
        path: '/mypage/change-password',
        element: <ProtectedRoute><ChangePasswordPage /></ProtectedRoute>,
      },
      {
        path: '/admin',
        element: <ProtectedRoute requiredRole="admin"><AdminHomePage /></ProtectedRoute>,
      },
      {
        path: '/admin/matches',
        element: <ProtectedRoute requiredRole="admin"><AdminMatchesPage /></ProtectedRoute>,
      },
      {
        path: '/admin/members',
        element: <ProtectedRoute requiredRole="admin"><AdminMembersPage /></ProtectedRoute>,
      },
    ],
  },
])
