import { CheckIcon } from '../../components/icons'
import { AWAY_SHORT, PORTION_SHORT, SKIP_REASON_SHORT, type Slot } from '../../types'
import { liveTone } from './weekView'

interface TodaySlotProps {
  slot: Slot
  onOpen: () => void
  onTick: () => void
}

/** One of today's three meals: big enough to tap "Ate it" without aiming. */
export function TodaySlot({ slot, onOpen, onTick }: TodaySlotProps) {
  const tone = liveTone(slot, true)
  const away = slot.away ?? null
  return (
    <div
      className={`flex min-h-[134px] flex-col rounded-md border-[1.5px] px-[10px] pt-[11px] pb-[10px] shadow-sm ${tone.box}`}
    >
      <span className={`text-[9.5px] font-bold tracking-[0.09em] uppercase ${tone.kicker}`}>
        {slot.mealType}
      </span>
      <button
        type="button"
        onClick={onOpen}
        className={`flex-1 cursor-pointer border-none bg-transparent pt-2 text-left text-[14.5px] leading-[1.25] font-semibold text-inherit ${
          tone.faded ? 'opacity-45' : ''
        }`}
        style={{ textWrap: 'pretty' }}
      >
        {away ? 'Out' : slot.mealName}
      </button>
      {away && (
        <div className="mt-2 truncate text-[11px] font-semibold text-neutral-600">
          {slot.awayNote || AWAY_SHORT[away]}
        </div>
      )}
      {!away && slot.outcome === 'pending' && (
        <button
          type="button"
          onClick={onTick}
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-[5px] rounded-full border-[1.5px] border-sage-400 bg-sage-100 py-[6px] text-[11.5px] font-bold text-sage-700 hover:bg-sage-200"
        >
          <CheckIcon size={13} />
          Ate it
        </button>
      )}
      {!away && slot.outcome === 'eaten' && (
        <div className="mt-2 flex items-center gap-[5px] text-[11.5px] font-bold text-sage-700">
          <CheckIcon size={13} />
          {slot.portionFeedback ? PORTION_SHORT[slot.portionFeedback] : 'Ate it'}
        </div>
      )}
      {!away && slot.outcome === 'skipped' && (
        <div className="mt-2 truncate text-[11px] font-semibold text-neutral-600">
          {slot.skipNote || (slot.skipReason ? SKIP_REASON_SHORT[slot.skipReason] : 'Skipped')}
        </div>
      )}
    </div>
  )
}
