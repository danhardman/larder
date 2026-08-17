import type { ReactNode } from 'react'

interface BottomSheetProps {
  kicker: string
  title: string
  note?: string | null
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({ kicker, title, note, onClose, children }: BottomSheetProps) {
  return (
    <div className="absolute inset-0 z-10">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="animate-fade absolute inset-0 cursor-pointer border-none bg-[rgba(32,30,29,0.42)] p-0"
      />
      <div
        role="dialog"
        aria-label={title}
        className="animate-rise absolute right-0 bottom-0 left-0 max-h-[82%] overflow-y-auto rounded-t-lg bg-bg px-[18px] pt-2 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-lg"
      >
        <div className="mx-auto mt-1 mb-[14px] h-1 w-11 rounded-full bg-neutral-300" />
        <div className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-600">{kicker}</div>
        <div className="mt-[6px] font-heading text-[23px] leading-[1.15]">{title}</div>
        {note && <div className="mt-2 text-[12.5px] leading-[1.5] text-neutral-600">{note}</div>}
        {children}
      </div>
    </div>
  )
}

/** The sheet's list rows share one look across actions, candidates and reasons. */
export function SheetRow({
  onClick,
  children,
  className = '',
}: {
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-md border-[1.5px] border-neutral-200 bg-neutral-100 px-[14px] py-[13px] text-left text-[14.5px] font-semibold text-inherit hover:border-accent-400 hover:bg-accent-100 ${className}`}
    >
      {children}
    </button>
  )
}
