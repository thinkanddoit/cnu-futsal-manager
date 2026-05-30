import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { router } from './router'
import { autoCompleteMatches } from './services/matches'

export default function App() {
  useEffect(() => {
    autoCompleteMatches().catch(() => {})
  }, [])

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
