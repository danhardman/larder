import { LockIcon } from '../../components/icons'
import { addDays, DAY_NAMES, formatDay } from '../../lib/dates'
import { AWAY_SHORT } from '../../types'
import { DayCard } from './DayCard'
import { TYPE_INITIAL, type IndexedSlot } from './weekView'

interface PlannerDayProps {
  weekStart: Date
  /** 0 = Monday. */
  day: number
  slots: IndexedSlot[]
  onOpenSlot: (index: number) => void
}

/**
 * One day of a week being planned: three tappable slots. Shared by the drafted view
 * and the pencilled one — a slot can be marked as a night we're out before the
 * week has been generated at all, so the grid can't wait for meals to exist.
 */
export function PlannerDay({ weekStart, day, slots, onOpenSlot }: PlannerDayProps) {
  return (
    <DayCard name={DAY_NAMES[day]} date={formatDay(addDays(weekStart, day))}>
      <div className="grid grid-cols-3 gap-[7px]">
        {slots.map(({ slot, index }) => {
          const away = slot.away ?? null
          return (
            <button
              key={index}
              type="button"
              onClick={() => onOpenSlot(index)}
              className={`flex min-h-[68px] cursor-pointer flex-col gap-1 rounded-xl border-[1.25px] p-2 text-left text-inherit hover:border-accent-400 ${
                away
                  ? 'border-dashed border-neutral-400 bg-neutral-200'
                  : slot.locked
                    ? 'border-accent-400 bg-accent-100'
                    : 'border-neutral-300 bg-bg'
              }`}
            >
              <span className="flex items-center justify-between gap-[3px]">
                <span
                  className={`text-[9px] font-bold tracking-[0.08em] ${
                    slot.locked && !away ? 'text-accent-700' : 'text-neutral-500'
                  }`}
                >
                  {TYPE_INITIAL[slot.mealType]}
                </span>
                {slot.locked && !away && <LockIcon size={11} className="flex-none text-accent-700" />}
              </span>
              <span
                className={`text-[12px] leading-[1.2] font-semibold ${
                  away || !slot.mealName ? 'text-neutral-600' : ''
                }`}
                style={{ textWrap: 'pretty' }}
              >
                {away ? AWAY_SHORT[away] : slot.mealName || '—'}
              </span>
              {away && slot.awayNote && (
                <span className="truncate text-[10px] font-medium text-neutral-500">{slot.awayNote}</span>
              )}
            </button>
          )
        })}
      </div>
    </DayCard>
  )
}
