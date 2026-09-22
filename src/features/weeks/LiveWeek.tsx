import { ArrowRightIcon } from '../../components/icons'
import { addDays, DAY_NAMES, formatDay, formatDayWithName, todayIndex } from '../../lib/dates'
import type { PortionFeedback, WeekPlan } from '../../types'
import { DayCard } from './DayCard'
import { PortionPrompt } from './PortionPrompt'
import { TodaySlot } from './TodaySlot'
import { liveTone, slotsForDay, TYPE_INITIAL, type SlotRef, type WeekView } from './weekView'

interface LiveWeekProps {
  week: WeekView
  portionFor: SlotRef | null
  onOpenSlot: (weekStart: string, index: number) => void
  onTick: (weekStart: string, index: number) => void
  onPortion: (weekStart: string, index: number, value: PortionFeedback, label: string) => void
  onDismissPortion: () => void
  onGoNextWeek: () => void
}

/** This week: an accepted plan you tick your way through. */
export function LiveWeek({
  week,
  portionFor,
  onOpenSlot,
  onTick,
  onPortion,
  onDismissPortion,
  onGoNextWeek,
}: LiveWeekProps) {
  const plan = week.plan as WeekPlan
  const today = todayIndex(week.start)
  const done = plan.slots.filter((s) => s.outcome !== 'pending').length
  const portionSlot =
    portionFor && portionFor.weekStart === week.iso ? plan.slots[portionFor.index] : null
  const restDays = Array.from({ length: 7 }, (_, d) => d).filter((d) => d !== today)

  return (
    <div>
      {today !== null && (
        <div className="px-5 pt-[18px]">
          <div className="mb-[11px] flex items-baseline gap-[9px]">
            <span className="font-heading text-[20px]">Today</span>
            <span className="text-[13px] font-semibold text-neutral-600">
              {formatDayWithName(addDays(week.start, today))}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-[9px]">
            {slotsForDay(plan, today).map(({ slot, index }) => (
              <TodaySlot
                key={index}
                slot={slot}
                onOpen={() => onOpenSlot(week.iso, index)}
                onTick={() => onTick(week.iso, index)}
              />
            ))}
          </div>
        </div>
      )}

      {portionSlot && portionFor && (
        <PortionPrompt
          slot={portionSlot}
          onPortion={(value, label) => onPortion(week.iso, portionFor.index, value, label)}
          onDismiss={onDismissPortion}
        />
      )}

      <div className="px-5 pt-[22px]">
        <div className="mb-[10px] flex items-baseline justify-between gap-[10px]">
          <span className="font-heading text-[17px]">
            {today === null ? 'The week' : 'The rest of the week'}
          </span>
          <span className="text-[11.5px] font-semibold text-neutral-500">
            {done} of {plan.slots.length} ticked
          </span>
        </div>
        <div className="flex flex-col gap-[9px]">
          {restDays.map((d) => (
            <DayCard key={d} name={DAY_NAMES[d]} date={formatDay(addDays(week.start, d))}>
              <div className="grid grid-cols-3 gap-[7px]">
                {slotsForDay(plan, d).map(({ slot, index }) => {
                  const tone = liveTone(slot, false)
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => onOpenSlot(week.iso, index)}
                      className={`flex min-h-16 cursor-pointer flex-col gap-1 rounded-xl border-[1.25px] p-2 text-left text-inherit hover:border-accent-400 ${tone.box}`}
                    >
                      <span className={`text-[9px] font-bold tracking-[0.08em] ${tone.kicker}`}>
                        {TYPE_INITIAL[slot.mealType]}
                      </span>
                      <span
                        className={`text-[12px] leading-[1.2] font-semibold ${tone.faded ? 'opacity-45' : ''}`}
                        style={{ textWrap: 'pretty' }}
                      >
                        {slot.mealName}
                      </span>
                    </button>
                  )
                })}
              </div>
            </DayCard>
          ))}
        </div>
      </div>

      <div className="mx-5 mt-5 rounded-md bg-neutral-200 px-4 py-[14px]">
        <div className="text-[13px] leading-[1.5] text-neutral-700">
          This week is locked — the shopping’s already done. Changing your mind? Plan it into next week
          instead.
        </div>
        <button
          type="button"
          className="btn btn-secondary mt-[11px] flex items-center gap-[7px] px-4 py-[9px] text-[13px] font-bold"
          onClick={onGoNextWeek}
        >
          Next week
          <ArrowRightIcon size={14} />
        </button>
      </div>
      <div className="h-6" />
    </div>
  )
}
