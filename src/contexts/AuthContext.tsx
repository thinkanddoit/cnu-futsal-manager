import { createContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { AppUser } from '../types'

interface AuthContextValue {
  firebaseUser: User | null
  appUser: AppUser | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  appUser: null,
  loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user)
      if (!user) {
        setAppUser(null)
        setLoading(false)
      }
    })
  }, [])

  useEffect(() => {
    if (!firebaseUser) return
    const ref = doc(db, 'users', firebaseUser.uid)
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setAppUser({ uid: firebaseUser.uid, ...snap.data() } as AppUser)
      } else {
        setAppUser(null)
      }
      setLoading(false)
    })
  }, [firebaseUser])

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const AuthContext_ = AuthContext
