import { useState } from 'react'
import { fromISODate } from '../../lib/dates'
import { seasonForWeek } from '../../lib/seasons'
import { rerollSlot } from '../../lib/generatePlan'
import { rngFrom } from '../../lib/rng'
import { useLarder } from '../../state/store'
import { useToast } from '../../state/toast'
import { SKIP_REASONS, type Meal, type PortionFeedback, type SkipReason } from '../../types'
import type { SlotRef } from './weekView'

export type SlotActions = ReturnType<typeof useSlotActions>

/**
 * Everything the user can do to a week or one of its slots, each paired with
 * its toast. Pure state changes live in the store; this layer adds the wording
 * and the follow-on UI (the portion prompt, the thin-library hint).
 */
export function useSlotActions({ onAccepted }: { onAccepted: () => void }) {
  const store = useLarder()
  const { say } = useToast()
  /** The slot just ticked as eaten, while the portion prompt is showing. */
  const [portionFor, setPortionFor] = useState<SlotRef | null>(null)
  const [thinHint, setThinHint] = useState<string | null>(null)

  const markEaten = (weekStart: string, index: number) => {
    store.patchSlot(weekStart, index, { outcome: 'eaten', skipReason: null })
    setPortionFor({ weekStart, index })
  }

  const markSkipped = (weekStart: string, index: number, reason: SkipReason, note?: string) => {
    store.patchSlot(weekStart, index, {
      outcome: 'skipped',
      skipReason: reason,
      // Empty stays null rather than '', so "has a note" is one truthy check.
      skipNote: note?.trim() || null,
      portionFeedback: null,
    })
    const label = SKIP_REASONS.find((r) => r.value === reason)?.label ?? 'Skipped'
    say(`Noted — ${label.toLowerCase()}.`)
  }

  const setPortion = (weekStart: string, index: number, value: PortionFeedback, label: string) => {
    store.patchSlot(weekStart, index, { portionFeedback: value })
    setPortionFor(null)
    say(`Logged: ${label.toLowerCase()}.`)
  }

  const dismissPortion = () => setPortionFor(null)

  const reroll = (weekStart: string, index: number) => {
    const plan = store.planFor(weekStart)
    if (!plan) return
    const pick = rerollSlot(
      plan.slots,
      index,
      store.meals,
      seasonForWeek(fromISODate(plan.weekStart)),
      rngFrom(Date.now() >>> 0),
    )
    if (!pick) {
      say('Library’s a bit thin there — add another one?')
      return
    }
    store.patchSlot(weekStart, index, { mealId: pick.id, mealName: pick.name })
    say(`${pick.name} it is.`)
  }

  const pickMeal = (weekStart: string, index: number, meal: Meal) => {
    store.patchSlot(weekStart, index, { mealId: meal.id, mealName: meal.name })
    say(`${meal.name} — good shout.`)
  }

  const setLocked = (weekStart: string, index: number, locked: boolean) => {
    store.patchSlot(weekStart, index, { locked })
    say(locked ? 'Locked — a re-roll won’t touch it.' : 'Unlocked.')
  }

  const draftWeek = (weekStart: string) => {
    const { thin } = store.draftWeek(weekStart)
    const drafted = seasonForWeek(fromISODate(weekStart))
    setThinHint(
      thin.length ? `Your library’s a bit thin for ${drafted} ${thin[0]} — worth adding one or two.` : null,
    )
    say('Here’s a draft — have a look before we shop.')
  }

  const acceptWeek = (weekStart: string) => {
    store.acceptWeek(weekStart)
    onAccepted()
    say('Locked in — list’s ready.')
  }

  const reopenWeek = (weekStart: string) => {
    store.reopenWeek(weekStart)
    say('Back to draft — tweak away.')
  }

  return {
    portionFor,
    thinHint,
    markEaten,
    markSkipped,
    setPortion,
    dismissPortion,
    reroll,
    pickMeal,
    setLocked,
    draftWeek,
    acceptWeek,
    reopenWeek,
  }
}
