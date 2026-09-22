import { assertNever } from '../../lib/assertNever'
import { formatWeekRange } from '../../lib/dates'
import type { WeekCard } from './WeekStrip'
import { isAway } from '../../types'
import { tickable, type WeekView } from './weekView'

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
    if (!plan || plan.status === 'pencilled') {
      const out = plan?.slots.filter(isAway).length ?? 0
      const pencilled = out ? `${out} night${out > 1 ? 's' : ''} out · tap to plan` : 'Tap to plan'
      return {
        key: w.iso,
        kicker,
        range,
        chip: w.offset < 0 ? 'No plan' : 'Not planned',
        chipClass: w.offset < 0 ? CHIP.neutral : CHIP.accent,
        meta: w.offset < 0 ? 'Nothing recorded' : pencilled,
      }
    }
    if (w.offset < 0) {
      const eaten = plan.slots.filter((s) => s.outcome === 'eaten').length
      const skipped = plan.slots.filter((s) => !isAway(s) && s.outcome === 'skipped').length
      const out = plan.slots.filter(isAway).length
      return {
        key: w.iso,
        kicker,
        range,
        chip: 'Done',
        chipClass: CHIP.neutral,
        // "0 out" is noise on the great majority of weeks, so it only appears when true.
        meta: `${eaten} eaten · ${skipped} skipped${out ? ` · ${out} out` : ''}`,
      }
    }
    switch (plan.status) {
      case 'draft':
        return {
          key: w.iso,
          kicker,
          range,
          chip: 'Draft',
          chipClass: CHIP.accent,
          meta: 'Review before shopping',
        }
      case 'generating':
        return {
          key: w.iso,
          kicker,
          range,
          chip: 'Drafting',
          chipClass: CHIP.accent,
          meta: 'Generating…',
        }
      case 'failed':
        return {
          key: w.iso,
          kicker,
          range,
          chip: 'Failed',
          chipClass: CHIP.accent,
          meta: 'Tap to try again',
        }
      case 'accepted': {
        const expected = tickable(plan)
        const done = expected.filter((s) => s.outcome !== 'pending').length
        return {
          key: w.iso,
          kicker,
          range,
          chip: w.offset === 0 ? 'Shopped' : 'Locked in',
          chipClass: CHIP.sage,
          meta: w.offset === 0 ? `${done} of ${expected.length} ticked` : 'List ready',
        }
      }
      default:
        return assertNever(plan.status, 'plan status')
    }
  })
}
