/**
 * Per-meal history derived from accepted weeks (spec §8): how often a meal was
 * cooked, skipped, and rated too much or not enough. Feeds the library's portion
 * warnings and the delete guard. Purely informational — never fed back into
 * the generator (spec §4).
 */

import type { WeekPlan } from '../types'

/** Outcome counts for one meal across every accepted week. */
export interface MealStats {
  timesCooked: number
  timesTooMuch: number
  timesNotEnough: number
  timesSkipped: number
  /** Cooks that actually carry portion feedback — the warning's denominator. */
  timesRated: number
}

const EMPTY: MealStats = {
  timesCooked: 0,
  timesTooMuch: 0,
  timesNotEnough: 0,
  timesSkipped: 0,
  timesRated: 0,
}

/**
 * The spec denormalises this onto the meal document; while the store is local
 * we recompute from plan history, which is the source of truth either way.
 */
export function statsByMeal(plans: WeekPlan[]): Map<string, MealStats> {
  const out = new Map<string, MealStats>()
  for (const plan of plans) {
    if (plan.status !== 'accepted') continue
    for (const slot of plan.slots) {
      if (!slot.mealId) continue
      const s = out.get(slot.mealId) ?? { ...EMPTY }
      if (slot.outcome === 'eaten') {
        s.timesCooked += 1
        if (slot.portionFeedback) s.timesRated += 1
        if (slot.portionFeedback === 'too_much') s.timesTooMuch += 1
        if (slot.portionFeedback === 'not_enough') s.timesNotEnough += 1
      } else if (slot.outcome === 'skipped') {
        s.timesSkipped += 1
      }
      out.set(slot.mealId, s)
    }
  }
  return out
}

/**
 * Meal ids referenced by any saved plan. Drafts count too: their shopping list
 * still resolves ingredients by id, so deleting the meal would quietly empty it.
 */
export function mealsInUse(plans: WeekPlan[]): Set<string> {
  const out = new Set<string>()
  for (const plan of plans) {
    for (const slot of plan.slots) {
      if (slot.mealId) out.add(slot.mealId)
    }
  }
  return out
}

/** Minimum rated cooks before any advice — below this one heavy night misleads. */
const MIN_RATED_COOKS = 3

/**
 * Advice for the meal editor and library card, or null. Warns when a majority
 * of rated cooks went one way — but only once there are enough ratings to trust.
 */
export function portionWarning(stats: MealStats | undefined): string | null {
  if (!stats || stats.timesRated < MIN_RATED_COOKS) return null
  if (stats.timesTooMuch * 2 > stats.timesRated) {
    return `Too much ${stats.timesTooMuch} of ${stats.timesRated} times — try trimming the quantities.`
  }
  if (stats.timesNotEnough * 2 > stats.timesRated) {
    return `Not enough ${stats.timesNotEnough} of ${stats.timesRated} times — worth buying a bit more.`
  }
  return null
}
