import { useState } from 'react'
import { fromISODate } from '../../lib/dates'
import { seasonForWeek } from '../../lib/seasons'
import { rerollSlot } from '../../lib/generatePlan'
import { rngFrom } from '../../lib/rng'
import { useLarder } from '../../state/store'
import { useToast } from '../../state/toast'
import {
  AWAY_REASONS,
  SKIP_REASONS,
  type Meal,
  type PortionFeedback,
  type SkipReason,
  type WeekPlan,
} from '../../types'
import { type SlotRef } from './weekView'

export type SlotActions = ReturnType<typeof useSlotActions>

/**
 * Everything the user can do to a week or one of its slots, each paired with
 * its toast. Pure state changes live in the store; this layer adds the wording
 * and the follow-on UI (the portion prompt).
 */
export function useSlotActions({ onAccepted }: { onAccepted: () => void }) {
  const store = useLarder()
  const { say } = useToast()
  /** The slot just ticked as eaten, while the portion prompt is showing. */
  const [portionFor, setPortionFor] = useState<SlotRef | null>(null)

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

  /**
   * Planned away: we're out that day, so the slot keeps no meal and buys nothing.
   * Unlike `markSkipped` this is a drafting decision, and works on a week that hasn't
   * been drafted at all — the store writes a blank plan to hold it.
   */
  const markAway = (weekStart: string, index: number, reason: SkipReason, note?: string) => {
    store.setSlotAway(weekStart, index, reason, note)
    const label = AWAY_REASONS.find((r) => r.value === reason)?.label ?? 'Out'
    say(`Noted — ${label.toLowerCase()}. Nothing bought for it.`)
  }

  /**
   * Back in: clear the marking and, on a drafted week, fill the gap it leaves. Both
   * halves go in one write — two patches in a tick would each be built from the same
   * pre-update snapshot, and the second would put `away` straight back.
   */
  const clearAway = (weekStart: string, index: number) => {
    const plan = store.planFor(weekStart)
    if (!plan) return
    // Nothing generated to leave a gap, or a week that's already shopped for: just
    // lift the marking rather than quietly adding a meal nobody has bought for.
    if (plan.status === 'pencilled' || plan.status === 'accepted') {
      store.patchSlot(weekStart, index, { away: null, awayNote: null })
      say('Back on the menu.')
      return
    }
    const pick = pickFor(plan, index)
    store.patchSlot(weekStart, index, {
      away: null,
      awayNote: null,
      mealId: pick?.id ?? null,
      mealName: pick?.name ?? '',
    })
    say(pick ? `${pick.name} it is.` : 'Back on the menu — nothing in the library fits, though.')
  }

  const setPortion = (weekStart: string, index: number, value: PortionFeedback, label: string) => {
    store.patchSlot(weekStart, index, { portionFeedback: value })
    setPortionFor(null)
    say(`Logged: ${label.toLowerCase()}.`)
  }

  const dismissPortion = () => setPortionFor(null)

  /** A fresh meal for one slot, with the rest of the week held fixed. */
  const pickFor = (plan: WeekPlan, index: number) =>
    rerollSlot(
      plan.slots,
      index,
      store.meals,
      seasonForWeek(fromISODate(plan.weekStart)),
      rngFrom(Date.now() >>> 0),
    )

  const reroll = (weekStart: string, index: number) => {
    const plan = store.planFor(weekStart)
    if (!plan) return
    const pick = pickFor(plan, index)
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
    // The result lands on the plan document, not here — the thin-library hint is
    // read off `plan.thin` by the Planner (spec §7.4, constraint 1).
    void store.draftWeek(weekStart)
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
    markEaten,
    markSkipped,
    markAway,
    clearAway,
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
