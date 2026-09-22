import type { ReactNode } from 'react'

export function DayCard({ name, date, children }: { name: string; date: string; children: ReactNode }) {
  return (
    <div className="rounded-md bg-neutral-100 px-3 py-[11px] shadow-sm">
      <div className="mb-2 flex items-baseline gap-[7px]">
        <span className="text-[12.5px] font-bold">{name}</span>
        <span className="text-[11px] font-medium text-neutral-500">{date}</span>
      </div>
      {children}
    </div>
  )
}
