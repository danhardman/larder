import { ArrowRightIcon, ShuffleIcon } from '../../components/icons'

interface DraftActionBarProps {
  onRedraft: () => void
  onAccept: () => void
}

/** Floats above the tab bar while a draft is being reviewed. */
export function DraftActionBar({ onRedraft, onAccept }: DraftActionBarProps) {
  return (
    <div className="absolute right-[14px] bottom-[calc(80px+env(safe-area-inset-bottom))] left-[14px] z-[7] flex gap-2">
      <button
        type="button"
        aria-label="Roll the whole week again"
        onClick={onRedraft}
        className="btn btn-secondary h-13 w-13 flex-none p-0 shadow-md"
      >
        <ShuffleIcon size={19} />
      </button>
      <button
        type="button"
        onClick={onAccept}
        className="btn btn-primary h-13 flex-1 gap-2 text-[15px] font-bold shadow-lg"
      >
        Looks good — build the list
        <ArrowRightIcon size={16} />
      </button>
    </div>
  )
}
