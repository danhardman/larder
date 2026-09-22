import type { ReactNode } from 'react'

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
