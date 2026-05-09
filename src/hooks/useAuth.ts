import { useContext } from 'react'
import { AuthContext_ } from '../contexts/AuthContext'

export function useAuth() {
  return useContext(AuthContext_)
}
