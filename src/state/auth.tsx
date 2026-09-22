import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  browserPopupRedirectResolver,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import type { ReactNode } from 'react'

export type AuthError = { code: string; message: string }

interface AuthValue {
  /** `loading` is the initial read of persisted credentials. */
  status: 'loading' | 'signed-out' | 'signed-in'
  user: User | null
  error: AuthError | null
  /** Must be called straight from a click handler — see `signInWithGoogle` below. */
  signInWithGoogle: () => void
  signOutOfLarder: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

const describe = (err: unknown): AuthError => {
  const e = err as { code?: string; message?: string }
  return {
    code: e?.code ?? 'unknown',
    message: e?.message ?? String(err),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (next) => {
      setUser(next)
      setReady(true)
    })
    return unsubscribe
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      status: !ready ? 'loading' : user ? 'signed-in' : 'signed-out',
      user,
      error,
      // No `await` before signInWithPopup: Safari only treats the popup as
      // user-initiated while the click handler's call stack is still live, so any
      // preceding await gets it blocked (spec §7.3, docs/firebase-setup.md §8).
      signInWithGoogle: () => {
        setError(null)
        signInWithPopup(auth, googleProvider, browserPopupRedirectResolver).catch((err) => {
          if (mounted.current) setError(describe(err))
        })
      },
      signOutOfLarder: () => {
        setError(null)
        signOut(auth)
      },
    }),
    [error, ready, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
