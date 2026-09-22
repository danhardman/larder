import { formatWeekRange } from '../../lib/dates'
import type { WeekCard } from './WeekStrip'
import type { WeekView } from './weekView'

const CHIP = {
  accent: 'bg-accent-200 text-accent-800',
  sage: 'bg-sage-200 text-sage-800',
  neutral: 'bg-neutral-300 text-neutral-800',
}

/** What the week strip says about each week: a status chip and a one-line summary. */
export function buildWeekCards(weeks: WeekView[]): WeekCard[] {
  return weeks.map((w) => {
    const plan = w.plan
    const kicker = w.offset < 0 ? 'Last week' : w.offset === 0 ? 'This week' : 'Next week'
    const range = formatWeekRange(w.start)
    if (!plan) {
      return {
        key: w.iso,
        kicker,
        range,
        chip: w.offset < 0 ? 'No plan' : 'Not planned',
        chipClass: w.offset < 0 ? CHIP.neutral : CHIP.accent,
        meta: w.offset < 0 ? 'Nothing recorded' : 'Tap to plan',
      }
    }
    if (w.offset < 0) {
      const eaten = plan.slots.filter((s) => s.outcome === 'eaten').length
      const skipped = plan.slots.filter((s) => s.outcome === 'skipped').length
      return {
        key: w.iso,
        kicker,
        range,
        chip: 'Done',
        chipClass: CHIP.neutral,
        meta: `${eaten} eaten · ${skipped} skipped`,
      }
    }
    if (plan.status === 'draft') {
      return {
        key: w.iso,
        kicker,
        range,
        chip: 'Draft',
        chipClass: CHIP.accent,
        meta: 'Review before shopping',
      }
    }
    const done = plan.slots.filter((s) => s.outcome !== 'pending').length
    return {
      key: w.iso,
      kicker,
      range,
      chip: w.offset === 0 ? 'Shopped' : 'Locked in',
      chipClass: CHIP.sage,
      meta: w.offset === 0 ? `${done} of ${plan.slots.length} ticked` : 'List ready',
    }
  })
}
