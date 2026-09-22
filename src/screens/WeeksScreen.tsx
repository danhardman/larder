import { addDays, DAY_NAMES, formatDay, formatDayWithName, todayIndex } from '../lib/dates'
import { portionWarning, type MealStats } from '../lib/stats'
import {
  PORTION_OPTIONS,
  PORTION_SHORT,
  SKIP_REASON_SHORT,
  type Meal,
  type PortionFeedback,
  type Slot,
  type WeekPlan,
} from '../types'
import {
  AlertIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  CloseIcon,
  LockIcon,
  ShuffleIcon,
} from '../components/icons'
import { WeekStrip, type WeekCard } from '../components/WeekStrip'

export interface WeekView {
  offset: number
  start: Date
  iso: string
  plan?: WeekPlan
}

interface WeeksScreenProps {
  weeks: WeekView[]
  cards: WeekCard[]
  selected: number
  onSelect: (index: number) => void
  seasonLabel: string
  meals: Meal[]
  stats: Map<string, MealStats>
  portionFor: { weekStart: string; index: number } | null
  onOpenSlot: (weekStart: string, index: number, scope: 'live' | 'draft') => void
  onTick: (weekStart: string, index: number) => void
  onPortion: (weekStart: string, index: number, value: PortionFeedback, label: string) => void
  onDismissPortion: () => void
  onDraft: (weekStart: string) => void
  onAccept: (weekStart: string) => void
  onReopen: (weekStart: string) => void
  onGoShop: () => void
  onGoWeek: (index: number) => void
  onEditMeal: (meal: Meal) => void
  /** e.g. "Your library's a bit thin for summer breakfasts" — set after a draft. */
  thinHint: string | null
}

type IndexedSlot = { slot: Slot; index: number }

function slotsForDay(plan: WeekPlan, day: number): IndexedSlot[] {
  return plan.slots.map((slot, index) => ({ slot, index })).filter((s) => s.slot.day === day)
}

const TYPE_INITIAL: Record<string, string> = { breakfast: 'B', lunch: 'L', dinner: 'D' }

function DayCard({ name, date, children }: { name: string; date: string; children: React.ReactNode }) {
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

/* ── This week: an accepted plan you tick your way through ─────────────── */

function liveTone(slot: Slot, isToday: boolean) {
  if (slot.outcome === 'eaten') {
    return { box: 'bg-sage-100 border-sage-300', kicker: 'text-sage-700', faded: false }
  }
  if (slot.outcome === 'skipped') {
    return { box: 'bg-neutral-200 border-neutral-200', kicker: 'text-neutral-500', faded: true }
  }
  return {
    box: `${isToday ? 'bg-neutral-100' : 'bg-bg'} border-neutral-200`,
    kicker: 'text-neutral-500',
    faded: false,
  }
}

function TodaySlot({
  slot,
  index,
  weekStart,
  onOpenSlot,
  onTick,
}: {
  slot: Slot
  index: number
  weekStart: string
  onOpenSlot: WeeksScreenProps['onOpenSlot']
  onTick: WeeksScreenProps['onTick']
}) {
  const tone = liveTone(slot, true)
  return (
    <div
      className={`flex min-h-[134px] flex-col rounded-md border-[1.5px] px-[10px] pt-[11px] pb-[10px] shadow-sm ${tone.box}`}
    >
      <span className={`text-[9.5px] font-bold tracking-[0.09em] uppercase ${tone.kicker}`}>
        {slot.mealType}
      </span>
      <button
        type="button"
        onClick={() => onOpenSlot(weekStart, index, 'live')}
        className={`flex-1 cursor-pointer border-none bg-transparent pt-2 text-left text-[14.5px] leading-[1.25] font-semibold text-inherit ${
          tone.faded ? 'opacity-45' : ''
        }`}
        style={{ textWrap: 'pretty' }}
      >
        {slot.mealName}
      </button>
      {slot.outcome === 'pending' && (
        <button
          type="button"
          onClick={() => onTick(weekStart, index)}
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-[5px] rounded-full border-[1.5px] border-sage-400 bg-sage-100 py-[6px] text-[11.5px] font-bold text-sage-700 hover:bg-sage-200"
        >
          <CheckIcon size={13} />
          Ate it
        </button>
      )}
      {slot.outcome === 'eaten' && (
        <div className="mt-2 flex items-center gap-[5px] text-[11.5px] font-bold text-sage-700">
          <CheckIcon size={13} />
          {slot.portionFeedback ? PORTION_SHORT[slot.portionFeedback] : 'Ate it'}
        </div>
      )}
      {slot.outcome === 'skipped' && (
        <div className="mt-2 truncate text-[11px] font-semibold text-neutral-600">
          {slot.skipNote || (slot.skipReason ? SKIP_REASON_SHORT[slot.skipReason] : 'Skipped')}
        </div>
      )}
    </div>
  )
}

function LiveWeek({
  week,
  props,
}: {
  week: WeekView
  props: WeeksScreenProps
}) {
  const plan = week.plan as WeekPlan
  const today = todayIndex(week.start)
  const done = plan.slots.filter((s) => s.outcome !== 'pending').length
  const portion =
    props.portionFor && props.portionFor.weekStart === week.iso
      ? plan.slots[props.portionFor.index]
      : null
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
                index={index}
                weekStart={week.iso}
                onOpenSlot={props.onOpenSlot}
                onTick={props.onTick}
              />
            ))}
          </div>
        </div>
      )}

      {portion && props.portionFor && (
        <div className="animate-pop mx-5 mt-3 rounded-md border-[1.5px] border-sage-300 bg-sage-100 px-[14px] py-[13px]">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-semibold">
              Enough {portion.mealName.toLowerCase()}?{' '}
              <span className="font-medium text-neutral-600">Skip if you like.</span>
            </span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={props.onDismissPortion}
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
                onClick={() =>
                  props.onPortion(week.iso, props.portionFor!.index, option.value, option.label)
                }
                className="flex-1 cursor-pointer rounded-full border-[1.5px] border-sage-400 bg-bg px-1 py-2 text-[11.5px] font-bold text-sage-800 hover:bg-sage-200"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
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
                      onClick={() => props.onOpenSlot(week.iso, index, 'live')}
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
          onClick={() => props.onGoWeek(2)}
        >
          Next week
          <ArrowRightIcon size={14} />
        </button>
      </div>
      <div className="h-6" />
    </div>
  )
}

/* ── Last week: read-only review ───────────────────────────────────────── */

function PastWeek({ week, props }: { week: WeekView; props: WeeksScreenProps }) {
  const plan = week.plan as WeekPlan
  const eaten = plan.slots.filter((s) => s.outcome === 'eaten').length
  const skipped = plan.slots.filter((s) => s.outcome === 'skipped').length
  const total = plan.slots.length || 1

  const plannedIds = new Set(plan.slots.map((s) => s.mealId).filter(Boolean) as string[])
  const heavy = props.meals.find(
    (m) => plannedIds.has(m.id) && portionWarning(props.stats.get(m.id)),
  )

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
            onClick={() => props.onEditMeal(heavy)}
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

/* ── A week you can still change: empty → draft → accepted ─────────────── */

function Planner({ week, props }: { week: WeekView; props: WeeksScreenProps }) {
  const plan = week.plan
  const status = !plan ? 'empty' : plan.status
  const stepIndex = status === 'empty' ? 0 : status === 'draft' ? 1 : 2
  const steps = ['Generate', 'Review & tweak', 'Shopping list']

  return (
    <div>
      <div className="px-5 pt-[18px]">
        <div className="flex items-center gap-[6px]">
          {steps.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col gap-[6px]">
              <div
                className={`h-1 rounded-full ${i <= stepIndex ? 'bg-accent-500' : 'bg-neutral-300'}`}
              />
              <span
                className={`text-[10.5px] font-bold tracking-[0.03em] ${
                  i === stepIndex ? 'text-accent-800' : 'text-neutral-500'
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {!plan && (
        <div className="px-5 pt-[22px]">
          <div className="rounded-lg border-[1.5px] border-dashed border-neutral-400 bg-neutral-100 px-[22px] py-7">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-200 text-accent-800">
              <CalendarIcon size={26} />
            </div>
            <div className="mt-4 font-heading text-[22px] leading-[1.2]">Nothing planned yet</div>
            <div className="mt-[9px] text-[13.5px] leading-[1.55] text-neutral-700" style={{ textWrap: 'pretty' }}>
              One tap gives you seven dinners with no repeats, plus a breakfast and lunch rotation. Tweak
              whatever you like before the list gets built.
            </div>
            <button
              type="button"
              onClick={() => props.onDraft(week.iso)}
              className="btn btn-primary mt-[18px] w-full gap-[9px] py-[14px] text-[15.5px] font-bold"
            >
              <ShuffleIcon size={17} />
              Draft the week
            </button>
          </div>
        </div>
      )}

      {plan && (
        <div>
          {plan.status === 'accepted' && (
            <div className="mx-5 mt-4 rounded-md border-[1.5px] border-sage-300 bg-sage-100 px-4 py-[14px]">
              <div className="flex items-center gap-[9px] text-sage-800">
                <CheckIcon size={17} strokeWidth={3} />
                <span className="text-[14px] font-bold">Locked in — list’s ready</span>
              </div>
              <div className="mt-[7px] text-[12.5px] leading-[1.5] text-sage-800">
                The shopping list is built from this week’s meals.
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary flex-1 py-[10px] text-[13.5px] font-bold"
                  onClick={props.onGoShop}
                >
                  See the list
                </button>
                <button
                  type="button"
                  className="btn btn-ghost px-[15px] py-[10px] text-[13.5px] font-semibold"
                  onClick={() => props.onReopen(week.iso)}
                >
                  Change something
                </button>
              </div>
            </div>
          )}

          {plan.status === 'draft' && (
            <div className="mx-5 mt-4 text-[13px] leading-[1.5] text-neutral-700">
              Tap any meal to roll it again, pick your own, or lock it. Locked slots survive a re-roll.
            </div>
          )}

          <div className="flex flex-col gap-[9px] px-5 pt-[14px]">
            {Array.from({ length: 7 }, (_, d) => (
              <DayCard key={d} name={DAY_NAMES[d]} date={formatDay(addDays(week.start, d))}>
                <div className="grid grid-cols-3 gap-[7px]">
                  {slotsForDay(plan, d).map(({ slot, index }) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => props.onOpenSlot(week.iso, index, 'draft')}
                      className={`flex min-h-[68px] cursor-pointer flex-col gap-1 rounded-xl border-[1.25px] p-2 text-left text-inherit hover:border-accent-400 ${
                        slot.locked ? 'border-accent-400 bg-accent-100' : 'border-neutral-300 bg-bg'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-[3px]">
                        <span
                          className={`text-[9px] font-bold tracking-[0.08em] ${
                            slot.locked ? 'text-accent-700' : 'text-neutral-500'
                          }`}
                        >
                          {TYPE_INITIAL[slot.mealType]}
                        </span>
                        {slot.locked && <LockIcon size={11} className="flex-none text-accent-700" />}
                      </span>
                      <span className="text-[12px] leading-[1.2] font-semibold" style={{ textWrap: 'pretty' }}>
                        {slot.mealName}
                      </span>
                    </button>
                  ))}
                </div>
              </DayCard>
            ))}
          </div>
          {plan.status === 'draft' && props.thinHint && (
            <div className="mx-5 mt-[14px] rounded-md border-[1.5px] border-dashed border-accent-300 bg-accent-100 px-[14px] py-3 text-[12.5px] leading-[1.45] text-accent-800">
              {props.thinHint}
            </div>
          )}
          <div className="h-24" />
        </div>
      )}
    </div>
  )
}

/* ── Screen ────────────────────────────────────────────────────────────── */

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
          <PastWeek week={week} props={props} />
        ) : (
          <div className="px-5 pt-6 text-[13.5px] leading-[1.5] text-neutral-600">
            Nothing was planned for last week — there’s nothing to look back on yet.
          </div>
        ))}

      {showLive && <LiveWeek week={week} props={props} />}
      {!isPast && !showLive && <Planner week={week} props={props} />}
    </div>
  )
}
