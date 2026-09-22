import type { MealStats } from '../../lib/stats'
import type { Meal, PortionFeedback } from '../../types'
import { LiveWeek } from './LiveWeek'
import { PastWeek } from './PastWeek'
import { Planner } from './Planner'
import { WeekStrip, type WeekCard } from './WeekStrip'
import type { SlotRef, SlotScope, WeekView } from './weekView'

interface WeeksScreenProps {
  weeks: WeekView[]
  cards: WeekCard[]
  selected: number
  onSelect: (index: number) => void
  seasonLabel: string
  meals: Meal[]
  stats: Map<string, MealStats>
  portionFor: SlotRef | null
  thinHint: string | null
  onOpenSlot: (weekStart: string, index: number, scope: SlotScope) => void
  onTick: (weekStart: string, index: number) => void
  onPortion: (weekStart: string, index: number, value: PortionFeedback, label: string) => void
  onDismissPortion: () => void
  onDraft: (weekStart: string) => void
  onReopen: (weekStart: string) => void
  onGoShop: () => void
  onGoWeek: (index: number) => void
  onEditMeal: (meal: Meal) => void
}

/** Header, the week strip, and whichever view the selected week calls for. */
export function WeeksScreen(props: WeeksScreenProps) {
  const week = props.weeks[props.selected]
  const isPast = week.offset < 0
  const showLive = !isPast && week.plan?.status === 'accepted' && week.offset === 0

  return (
    <div>
      <div className="sticky top-0 z-[5] border-b border-divider bg-bg pt-5 pb-3">
        <div className="flex items-baseline justify-between gap-[10px] px-5 pb-3">
          <span className="font-heading text-[26px] leading-none tracking-[-0.3px]">Larder</span>
          <span className="text-[11.5px] font-semibold tracking-[0.03em] text-neutral-500">
            {props.seasonLabel}
          </span>
        </div>
        <WeekStrip weeks={props.cards} selected={props.selected} onSelect={props.onSelect} />
      </div>

      {isPast &&
        (week.plan ? (
          <PastWeek week={week} meals={props.meals} stats={props.stats} onEditMeal={props.onEditMeal} />
        ) : (
          <div className="px-5 pt-6 text-[13.5px] leading-[1.5] text-neutral-600">
            Nothing was planned for last week — there’s nothing to look back on yet.
          </div>
        ))}

      {showLive && (
        <LiveWeek
          week={week}
          portionFor={props.portionFor}
          onOpenSlot={(weekStart, index) => props.onOpenSlot(weekStart, index, 'live')}
          onTick={props.onTick}
          onPortion={props.onPortion}
          onDismissPortion={props.onDismissPortion}
          onGoNextWeek={() => props.onGoWeek(2)}
        />
      )}

      {!isPast && !showLive && (
        <Planner
          week={week}
          thinHint={props.thinHint}
          onDraft={props.onDraft}
          onReopen={props.onReopen}
          onOpenSlot={(weekStart, index) => props.onOpenSlot(weekStart, index, 'draft')}
          onGoShop={props.onGoShop}
        />
      )}
    </div>
  )
}
