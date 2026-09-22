import { AlertIcon } from '../../components/icons'
import { addDays, DAY_NAMES, formatDay } from '../../lib/dates'
import { portionWarning, type MealStats } from '../../lib/stats'
import { SKIP_REASON_SHORT, type Meal, type WeekPlan } from '../../types'
import { DayCard } from './DayCard'
import { slotsForDay, TYPE_INITIAL, type WeekView } from './weekView'

interface PastWeekProps {
  week: WeekView
  meals: Meal[]
  stats: Map<string, MealStats>
  onEditMeal: (meal: Meal) => void
}

/** Last week: read-only review of what got eaten. */
export function PastWeek({ week, meals, stats, onEditMeal }: PastWeekProps) {
  const plan = week.plan as WeekPlan
  const eaten = plan.slots.filter((s) => s.outcome === 'eaten').length
  const skipped = plan.slots.filter((s) => s.outcome === 'skipped').length
  const total = plan.slots.length || 1

  const plannedIds = new Set(plan.slots.map((s) => s.mealId).filter(Boolean) as string[])
  const heavy = meals.find((m) => plannedIds.has(m.id) && portionWarning(stats.get(m.id)))

  return (
    <div>
      <div className="mx-5 mt-[18px] rounded-md bg-neutral-200 px-4 py-[15px]">
        <div className="font-heading text-[17px] leading-[1.15]">How it went</div>
        <div className="mt-3 flex gap-[18px]">
          {[
            { value: eaten, label: 'eaten', tone: 'text-sage-700' },
            { value: skipped, label: 'skipped', tone: 'text-accent-700' },
            { value: `${Math.round((eaten / total) * 100)}%`, label: 'as planned', tone: 'text-neutral-800' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className={`font-heading text-2xl leading-none ${stat.tone}`}>{stat.value}</div>
              <div className="mt-[5px] text-[10.5px] font-bold tracking-[0.05em] uppercase text-neutral-600">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        {heavy && (
          <button
            type="button"
            onClick={() => onEditMeal(heavy)}
            className="mt-[14px] flex w-full cursor-pointer items-start gap-[9px] rounded-[14px] border-[1.5px] border-accent-300 bg-accent-100 px-[13px] py-[11px] text-left text-accent-800 hover:border-accent-500"
          >
            <AlertIcon size={15} className="mt-px flex-none" />
            <span className="text-[12.5px] leading-[1.45] font-semibold">
              {heavy.name} made too much again — trim the quantities?
            </span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-[9px] px-5 pt-[18px]">
        {Array.from({ length: 7 }, (_, d) => (
          <DayCard key={d} name={DAY_NAMES[d]} date={formatDay(addDays(week.start, d))}>
            <div className="grid grid-cols-3 gap-[7px]">
              {slotsForDay(plan, d).map(({ slot, index }) => {
                const wasEaten = slot.outcome === 'eaten'
                return (
                  <div
                    key={index}
                    className={`flex min-h-[62px] flex-col gap-1 rounded-xl border-[1.25px] p-2 ${
                      wasEaten ? 'border-sage-300 bg-sage-100' : 'border-neutral-300 bg-neutral-200'
                    }`}
                  >
                    <span
                      className={`text-[9px] font-bold tracking-[0.08em] ${
                        wasEaten ? 'text-sage-700' : 'text-neutral-500'
                      }`}
                    >
                      {TYPE_INITIAL[slot.mealType]}
                    </span>
                    <span
                      className={`text-[12px] leading-[1.2] font-semibold ${wasEaten ? '' : 'opacity-45'}`}
                      style={{ textWrap: 'pretty' }}
                    >
                      {slot.mealName}
                    </span>
                    <span className="mt-auto text-[9.5px] font-bold text-neutral-600">
                      {wasEaten
                        ? slot.portionFeedback === 'too_much'
                          ? 'Too much'
                          : slot.portionFeedback === 'not_enough'
                            ? 'Not enough'
                            : 'Eaten'
                        : slot.skipReason
                          ? SKIP_REASON_SHORT[slot.skipReason]
                          : 'Not ticked'}
                    </span>
                  </div>
                )
              })}
            </div>
          </DayCard>
        ))}
      </div>
      <div className="h-6" />
    </div>
  )
}
