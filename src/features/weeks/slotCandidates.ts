import { fromISODate } from '../../lib/dates'
import { seasonForWeek } from '../../lib/seasons'
import { eligible } from '../../lib/generatePlan'
import type { Meal, WeekPlan } from '../../types'

/**
 * Meals a slot could be swapped to by hand: right type and season for the
 * week, not already on the same day, and — for dinners — not already
 * anywhere in the week. The slot's current meal stays in the list.
 */
export function candidatesFor(plan: WeekPlan, index: number, meals: Meal[]): Meal[] {
  const slot = plan.slots[index]
  if (!slot) return []
  const used = new Set<string>()
  for (const s of plan.slots) if (s.day === slot.day && s.mealId) used.add(s.mealId)
  if (slot.mealType === 'dinner') {
    for (const s of plan.slots) if (s.mealType === 'dinner' && s.mealId) used.add(s.mealId)
  }
  return eligible(meals, slot.mealType, seasonForWeek(fromISODate(plan.weekStart))).filter(
    (m) => m.id === slot.mealId || !used.has(m.id),
  )
}
