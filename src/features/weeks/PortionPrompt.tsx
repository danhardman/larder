import { CloseIcon } from '../../components/icons'
import { PORTION_OPTIONS, type PortionFeedback, type Slot } from '../../types'

interface PortionPromptProps {
  slot: Slot
  onPortion: (value: PortionFeedback, label: string) => void
  onDismiss: () => void
}

/** Shown once right after "Ate it". Optional by design — skipping it must cost nothing. */
export function PortionPrompt({ slot, onPortion, onDismiss }: PortionPromptProps) {
  return (
    <div className="animate-pop mx-5 mt-3 rounded-md border-[1.5px] border-sage-300 bg-sage-100 px-[14px] py-[13px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold">
          Enough {slot.mealName.toLowerCase()}?{' '}
          <span className="font-medium text-neutral-600">Skip if you like.</span>
        </span>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="cursor-pointer border-none bg-transparent p-[2px] text-neutral-600"
        >
          <CloseIcon size={15} />
        </button>
      </div>
      <div className="mt-[10px] flex gap-2">
        {PORTION_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onPortion(option.value, option.label)}
            className="flex-1 cursor-pointer rounded-full border-[1.5px] border-sage-400 bg-bg px-1 py-2 text-[11.5px] font-bold text-sage-800 hover:bg-sage-200"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
