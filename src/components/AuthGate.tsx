import { useState } from 'react'
import { SignInScreen } from '../screens/SignInScreen'
import { useAuth } from '../state/auth'
import type { ReactNode } from 'react'

/** Gates the whole app behind a signed-in Google account (spec §7.3, M0).
 *  Household membership comes later — Stage 3 — so for now any account gets in. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg">
        <p className="text-[13px] tracking-[0.08em] text-neutral-600 uppercase">Opening the larder…</p>
      </div>
    )
  }

  if (status === 'signed-out') return <SignInScreen />

  return (
    <>
      {children}
      <AccountPill />
    </>
  )
}

/** Spike-only affordance: there is no Settings screen until Stage 5, and without a
 *  way back out you can't re-test sign-in on the phone. Delete it when Settings lands. */
function AccountPill() {
  const { user, signOutOfLarder } = useAuth()
  const [open, setOpen] = useState(false)
  const label = user?.displayName || user?.email || 'Signed in'

  return (
    <div className="fixed top-[calc(8px+env(safe-area-inset-top))] right-3 z-50 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Account: ${label}`}
        className="h-8 w-8 cursor-pointer overflow-hidden rounded-full border border-divider bg-neutral-100 text-[12px] font-bold text-neutral-800 shadow-sm"
      >
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
        ) : (
          label.slice(0, 1).toUpperCase()
        )}
      </button>

      {open && (
        <div className="w-[220px] rounded-md border border-divider bg-neutral-100 p-3 shadow-md">
          <p className="truncate text-[13px] font-bold text-text">{label}</p>
          {user?.email && user.email !== label && (
            <p className="truncate text-[12px] text-neutral-600">{user.email}</p>
          )}
          <button
            type="button"
            onClick={signOutOfLarder}
            className="mt-3 w-full cursor-pointer rounded-sm border border-neutral-400 bg-transparent px-3 py-2 text-[13px] font-bold text-neutral-800"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
