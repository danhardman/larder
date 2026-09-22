import type { ReactNode } from 'react'

interface SectionProps {
  title: string
  hint?: string
  children: ReactNode
}

/** A titled, card-wrapped block of settings-style content. */
export function Section({ title, hint, children }: SectionProps) {
  return (
    <section className="px-5 pt-6">
      <h2 className="text-[12px] font-bold tracking-[0.12em] text-neutral-600 uppercase">{title}</h2>
      {hint && <p className="mt-1 text-[12.5px] leading-[1.5] text-neutral-600">{hint}</p>}
      <div className="mt-3 rounded-md border border-divider bg-neutral-100 px-4 py-2">{children}</div>
    </section>
  )
}
