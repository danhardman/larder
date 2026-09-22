import type { ReactNode } from 'react'
import { useAuth } from '../../state/auth'

/** The phone-width frame shared by the sign-in, join and locked-out screens. */
export function GateShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="flex h-dvh justify-center overflow-hidden bg-neutral-300">
      <div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-y-auto bg-bg px-6 shadow-[0_0_60px_rgba(46,43,37,0.18)]">
        <div className="flex flex-1 flex-col justify-center gap-7 py-10">
          <div>
            <p className="text-[12px] font-bold tracking-[0.14em] text-neutral-600 uppercase">{eyebrow}</p>
            <h1 className="mt-2 font-heading text-[42px] leading-[1.05] text-text">{title}</h1>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

/** "Signed in as … · Sign out" — for the screens where the wrong account is the
 *  likeliest reason you're seeing them. */
export function SignedInAs() {
  const { user, signOutOfLarder } = useAuth()
  return (
    <p className="text-[13px] leading-[1.5] text-neutral-600">
      Signed in as <span className="font-bold text-neutral-800">{user?.email}</span>.{' '}
      <button type="button" onClick={signOutOfLarder} className="btn btn-ghost inline px-0 text-[13px]">
        Not you? Sign out
      </button>
    </p>
  )
}
