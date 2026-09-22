import { CalendarIcon, CheckIcon, LockIcon, ShuffleIcon } from '../../components/icons'
import { addDays, DAY_NAMES, formatDay } from '../../lib/dates'
import { DayCard } from './DayCard'
import { slotsForDay, TYPE_INITIAL, type WeekView } from './weekView'

interface PlannerProps {
  week: WeekView
  /** e.g. "Your library's a bit thin for summer breakfasts" — set after a draft. */
  thinHint: string | null
  onDraft: (weekStart: string) => void
  onReopen: (weekStart: string) => void
  onOpenSlot: (weekStart: string, index: number) => void
  onGoShop: () => void
}

/** A week you can still change: empty → draft → accepted. */
export function Planner({ week, thinHint, onDraft, onReopen, onOpenSlot, onGoShop }: PlannerProps) {
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
              onClick={() => onDraft(week.iso)}
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
                      onClick={() => onOpenSlot(week.iso, index)}
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
          {plan.status === 'draft' && thinHint && (
            <div className="mx-5 mt-[14px] rounded-md border-[1.5px] border-dashed border-accent-300 bg-accent-100 px-[14px] py-3 text-[12.5px] leading-[1.45] text-accent-800">
              {thinHint}
            </div>
          )}
          <div className="h-24" />
        </div>
      )}
    </div>
  )
}
