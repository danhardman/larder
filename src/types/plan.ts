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
  outcome: Outcome
  skipReason: SkipReason | null
  skipNote?: string | null
  portionFeedback: PortionFeedback | null
}

/**
 * `generating` and `failed` exist for the planned backend (spec §7.4): v1 never
 * writes them, but the screens render them so a server-generated plan is not a
 * new concept the UI has to learn.
 */
export type PlanStatus = 'generating' | 'draft' | 'accepted' | 'failed'

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
  /** Shopping-list ticks for this week, keyed by `name|unit`. */
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
