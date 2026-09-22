/** A planned week: seven days of slots, and what actually happened to each. */

import type { MealType } from './meal'

export type Outcome = 'pending' | 'eaten' | 'skipped'
export type SkipReason = 'ate_out' | 'takeaway' | 'at_friends' | 'other'
export type PortionFeedback = 'too_much' | 'about_right' | 'not_enough'

export interface Slot {
  /** 0 = Monday. */
  day: number
  mealType: MealType
  mealId: string | null
  /** Denormalised so a historical week still renders if the meal is renamed. */
  mealName: string
  locked: boolean
  away?: SkipReason | null
  awayNote?: string | null
  outcome: Outcome
  skipReason: SkipReason | null
  skipNote?: string | null
  portionFeedback: PortionFeedback | null
}

export const isAway = (slot: Pick<Slot, 'away'>) => !!slot.away

export const isResolved = (slot: Pick<Slot, 'away' | 'outcome'>) =>
  isAway(slot) || slot.outcome !== 'pending'

/**
 * `generating` and `failed` exist for the planned backend (spec §7.4): v1 never
 * writes them, but the screens render them so a server-generated plan is not a
 * new concept the UI has to learn.
 *
 * `pencilled` is a week that exists only to hold away markings — you can say "we're
 * out Thursday" before you're ready to plan, and the marking needs a document to live
 * on. It is deliberately a status rather than something each screen re-derives from
 * the slots: a blank week claiming to be a `draft` made every call site responsible
 * for spotting the lie, and one that forgot showed an empty week as ready to review.
 *
 * Widening this enum is the move §5 warns against for `Outcome` — but that argument
 * is about values that get *compared* (`outcome === 'eaten'`), where a new member is
 * silently excluded. Screens switch on this one exhaustively via `assertNever`, so a
 * sixth status is a compile error naming every place that has to handle it.
 */
export type PlanStatus = 'pencilled' | 'generating' | 'draft' | 'accepted' | 'failed'

export interface WeekPlan {
  id: string
  /** ISO date of the Monday this plan covers — also the recency sort key. */
  weekStart: string
  slots: Slot[]
  status: PlanStatus
  /** RNG seed, persisted so a baffling plan can be reproduced. */
  seed: number
  /** Meal types the library couldn't comfortably cover, e.g. `['breakfasts']`. Persisted
   *  on the plan rather than returned from `draftWeek` so the UI reads it off the
   *  document it is already subscribed to (spec §3). */
  thin: string[]
  /** Which side produced this plan. Always `client` until the backend lands. */
  generatedBy: 'client' | 'server'
  /** Shopping-list ticks for this week, keyed by `ingredientId|unit` (`lineKey`). */
  ticked: Record<string, boolean>
}

/* Labels live with the enums they describe so a new value can't be added without one. */

export const SKIP_REASONS: { value: SkipReason; label: string }[] = [
  { value: 'ate_out', label: 'We ate out' },
  { value: 'takeaway', label: 'Takeaway won' },
  { value: 'at_friends', label: 'At a friend’s' },
  { value: 'other', label: 'Something else' },
]

export const SKIP_REASON_SHORT: Record<SkipReason, string> = {
  ate_out: 'Ate out',
  takeaway: 'Takeaway',
  at_friends: 'At a friend’s',
  other: 'Skipped',
}

export const AWAY_REASONS: { value: SkipReason; label: string }[] = [
  { value: 'ate_out', label: 'We’re eating out' },
  { value: 'takeaway', label: 'Takeaway night' },
  { value: 'at_friends', label: 'At a friend’s' },
  { value: 'other', label: 'Something else' },
]

export const AWAY_SHORT: Record<SkipReason, string> = {
  ate_out: 'Eating out',
  takeaway: 'Takeaway',
  at_friends: 'At a friend’s',
  other: 'Out',
}

export const PORTION_OPTIONS: { value: PortionFeedback; label: string }[] = [
  { value: 'too_much', label: 'Too much' },
  { value: 'about_right', label: 'About right' },
  { value: 'not_enough', label: 'Not enough' },
]

export const PORTION_SHORT: Record<PortionFeedback, string> = {
  too_much: 'Too much',
  about_right: 'Ate it',
  not_enough: 'Not enough',
}
