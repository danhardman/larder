import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  browserPopupRedirectResolver,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import type { ReactNode } from 'react'

export type AuthError = { code: string; message: string; from: 'popup' | 'redirect' }

interface AuthValue {
  /** `loading` covers both the initial persistence read and a pending redirect result. */
  status: 'loading' | 'signed-out' | 'signed-in'
  user: User | null
  error: AuthError | null
  /** Must be called straight from a click handler — see `signInWithGoogle` below. */
  signInWithGoogle: () => void
  /** The M0 fallback path: the thing to try if the popup fails on an installed PWA. */
  signInWithGoogleRedirect: () => void
  signOutOfLarder: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

const describe = (err: unknown, from: AuthError['from']): AuthError => {
  const e = err as { code?: string; message?: string }
  return {
    code: e?.code ?? 'unknown',
    message: e?.message ?? String(err),
    from,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  // A redirect sign-in that is still resolving must not flash the sign-in screen.
  const [redirecting, setRedirecting] = useState(false)
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

  useEffect(() => {
    // Only meaningful after a redirect sign-in; harmless (resolves null) otherwise.
    getRedirectResult(auth, browserPopupRedirectResolver).catch((err) => {
      if (mounted.current) setError(describe(err, 'redirect'))
    })
  }, [])

  const value = useMemo<AuthValue>(() => {
    const status = !ready ? 'loading' : user ? 'signed-in' : 'signed-out'

    return {
      status: status === 'signed-out' && redirecting ? 'loading' : status,
      user,
      error,
      // No `await` before signInWithPopup: Safari only treats the popup as
      // user-initiated while the click handler's call stack is still live, so any
      // preceding await gets it blocked (spec §7.3, docs/firebase-setup.md §8).
      signInWithGoogle: () => {
        setError(null)
        signInWithPopup(auth, googleProvider, browserPopupRedirectResolver).catch((err) => {
          if (mounted.current) setError(describe(err, 'popup'))
        })
      },
      signInWithGoogleRedirect: () => {
        setError(null)
        setRedirecting(true)
        signInWithRedirect(auth, googleProvider, browserPopupRedirectResolver).catch((err) => {
          if (!mounted.current) return
          setRedirecting(false)
          setError(describe(err, 'redirect'))
        })
      },
      signOutOfLarder: () => {
        setError(null)
        signOut(auth)
      },
    }
  }, [error, ready, redirecting, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
