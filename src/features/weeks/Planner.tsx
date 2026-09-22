import { useMemo } from 'react'
import { CalendarIcon, CheckIcon, ShuffleIcon } from '../../components/icons'
import { blankSlots } from '../../lib/generatePlan'
import { seasonForWeek } from '../../lib/seasons'
import { assertNever } from '../../lib/assertNever'
import type { PlanStatus } from '../../types'
import { PlannerDay } from './PlannerDay'
import { slotsForDay, type WeekView } from './weekView'

function plannerStep(status: PlanStatus): number {
  switch (status) {
    case 'pencilled':
    case 'failed':
      return 0
    case 'draft':
    case 'generating':
      return 1
    case 'accepted':
      return 2
    default:
      return assertNever(status, 'plan status')
  }
}

interface PlannerProps {
  week: WeekView
  onDraft: (weekStart: string) => void
  onReopen: (weekStart: string) => void
  onOpenSlot: (weekStart: string, index: number) => void
  onGoShop: () => void
}

/**
 * A week you can still change: empty → draft → accepted. `generating` renders as a
 * draft that can't be tweaked yet and `failed` as an empty week with a retry; v1
 * never writes either, but a server-generated plan will (spec §3).
 */
export function Planner({ week, onDraft, onReopen, onOpenSlot, onGoShop }: PlannerProps) {
  const plan = week.plan
  const status: PlanStatus = plan?.status ?? 'pencilled'
  const stepIndex = plannerStep(status)
  const steps = ['Generate', 'Review & tweak', 'Shopping list']
  const showEmpty = status === 'pencilled' || status === 'failed'
  const slots = useMemo(() => plan?.slots ?? blankSlots(), [plan])
  const thinHint = plan?.thin.length
    ? `Your library’s a bit thin for ${seasonForWeek(week.start)} ${plan.thin[0]} — worth adding one or two.`
    : null

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

      {showEmpty && (
        <div className="px-5 pt-[22px]">
          <div className="rounded-lg border-[1.5px] border-dashed border-neutral-400 bg-neutral-100 px-[22px] py-7">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-200 text-accent-800">
              <CalendarIcon size={26} />
            </div>
            <div className="mt-4 font-heading text-[22px] leading-[1.2]">
              {status === 'failed' ? 'That draft didn’t land' : 'Nothing planned yet'}
            </div>
            <div className="mt-[9px] text-[13.5px] leading-[1.55] text-neutral-700" style={{ textWrap: 'pretty' }}>
              {status === 'failed'
                ? 'Something went wrong generating this week. Try again — nothing you had is lost.'
                : 'One tap gives you seven dinners with no repeats, plus a breakfast and lunch rotation. Tweak whatever you like before the list gets built.'}
            </div>
            <button
              type="button"
              onClick={() => onDraft(week.iso)}
              className="btn btn-primary mt-[18px] w-full gap-[9px] py-[14px] text-[15.5px] font-bold"
            >
              <ShuffleIcon size={17} />
              {status === 'failed' ? 'Try again' : 'Draft the week'}
            </button>
          </div>
          <div className="mt-[18px] text-[13px] leading-[1.5] text-neutral-700">
            Out one night? Tap the slot and mark it first — it’ll stay empty, and nothing gets
            bought for it.
          </div>
        </div>
      )}

      {plan && !showEmpty && (
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
                  onClick={onGoShop}
                >
                  See the list
                </button>
                <button
                  type="button"
                  className="btn btn-ghost px-[15px] py-[10px] text-[13.5px] font-semibold"
                  onClick={() => onReopen(week.iso)}
                >
                  Change something
                </button>
              </div>
            </div>
          )}

          {plan.status === 'draft' && (
            <div className="mx-5 mt-4 text-[13px] leading-[1.5] text-neutral-700">
              Tap any meal to roll it again, pick your own, lock it, or mark a night you’re out.
            </div>
          )}

          {plan.status === 'generating' && (
            <div className="mx-5 mt-4 text-[13px] leading-[1.5] text-neutral-700">
              Drafting this week… it’ll fill in as soon as it’s ready.
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-[9px] px-5 pt-[14px]">
        {Array.from({ length: 7 }, (_, d) => (
          <PlannerDay
            key={d}
            weekStart={week.start}
            day={d}
            slots={slotsForDay(slots, d)}
            onOpenSlot={(index) => onOpenSlot(week.iso, index)}
          />
        ))}
      </div>
      {status === 'draft' && thinHint && (
        <div className="mx-5 mt-[14px] rounded-md border-[1.5px] border-dashed border-accent-300 bg-accent-100 px-[14px] py-3 text-[12.5px] leading-[1.45] text-accent-800">
          {thinHint}
        </div>
      )}
      <div className="h-24" />
    </div>
  )
}
