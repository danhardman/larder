/**
 * Which season a week belongs to. A business rule, not a date utility: the
 * generator only draws meals tagged for the week's season (spec §4).
 */

import type { Season } from '../types'

/**
 * Season for a zero-based month. Northern hemisphere, hard-coded; one function
 * so a hemisphere setting would have exactly one place to go.
 */
export function seasonForMonth(month: number): Season {
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}

/**
 * The season a plan should draw meals from. Always the week's season, never
 * today's — drafting in late February for a March week must pick spring meals.
 * A week straddling a month boundary takes the month it starts in.
 * Used by the store when drafting and by every re-roll / pick in `features/weeks`.
 */
export function seasonForWeek(weekStart: Date): Season {
  return seasonForMonth(weekStart.getMonth())
}
