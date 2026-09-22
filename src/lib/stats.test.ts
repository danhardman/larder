import { describe, expect, it } from 'vitest'
import { mealsInUse, portionWarning, statsByMeal, type MealStats } from './stats'
import type { Outcome, PortionFeedback, Slot, WeekPlan } from '../types'

function slot(
  mealId: string | null,
  outcome: Outcome = 'pending',
  portionFeedback: PortionFeedback | null = null,
): Slot {
  return {
    day: 0,
    mealType: 'dinner',
    mealId,
    mealName: mealId ?? '',
    locked: false,
    outcome,
    skipReason: outcome === 'skipped' ? 'ate_out' : null,
    portionFeedback,
  }
}

function plan(weekStart: string, status: WeekPlan['status'], slots: Slot[]): WeekPlan {
  return { id: weekStart, weekStart, slots, status, seed: 1 }
}

function simple(weekStart: string, status: WeekPlan['status'], mealIds: (string | null)[]): WeekPlan {
  return plan(weekStart, status, mealIds.map((id) => slot(id)))
}

/** Reads a meal's stats, failing loudly rather than returning undefined. */
function statsFor(plans: WeekPlan[], mealId: string): MealStats {
  const s = statsByMeal(plans).get(mealId)
  if (!s) throw new Error(`no stats for ${mealId}`)
  return s
}

function rated(timesRated: number, timesTooMuch = 0, timesNotEnough = 0): MealStats {
  return { timesCooked: timesRated, timesTooMuch, timesNotEnough, timesSkipped: 0, timesRated }
}

describe('mealsInUse', () => {
  it('collects meal ids from drafts as well as accepted weeks', () => {
    const used = mealsInUse([
      simple('2026-01-05', 'accepted', ['m1', 'm2']),
      simple('2026-01-12', 'draft', ['m3']),
    ])
    expect([...used].sort()).toEqual(['m1', 'm2', 'm3'])
  })

  it('ignores empty slots', () => {
    expect(mealsInUse([simple('2026-01-05', 'accepted', [null, null])]).size).toBe(0)
  })

  it('is empty when there are no plans', () => {
    expect(mealsInUse([]).size).toBe(0)
  })
})

describe('statsByMeal', () => {
  it('splits eaten from skipped across several weeks', () => {
    const stats = statsFor(
      [
        plan('2026-01-05', 'accepted', [slot('m1', 'eaten'), slot('m1', 'skipped')]),
        plan('2026-01-12', 'accepted', [slot('m1', 'eaten')]),
      ],
      'm1',
    )
    expect(stats.timesCooked).toBe(2)
    expect(stats.timesSkipped).toBe(1)
  })

  it('leaves pending slots out of both buckets', () => {
    const stats = statsFor([plan('2026-01-05', 'accepted', [slot('m1', 'eaten'), slot('m1')])], 'm1')
    expect(stats.timesCooked).toBe(1)
    expect(stats.timesSkipped).toBe(0)
  })

  it('ignores drafts — an unshopped week has not been eaten', () => {
    expect(statsByMeal([plan('2026-01-05', 'draft', [slot('m1', 'eaten')])]).size).toBe(0)
  })

  it('ignores empty slots', () => {
    expect(statsByMeal([plan('2026-01-05', 'accepted', [slot(null, 'eaten')])]).size).toBe(0)
  })

  it('counts only rated cooks in timesRated', () => {
    const stats = statsFor(
      [
        plan('2026-01-05', 'accepted', [
          slot('m1', 'eaten', 'too_much'),
          slot('m1', 'eaten', 'about_right'),
          slot('m1', 'eaten', null),
        ]),
      ],
      'm1',
    )
    expect(stats.timesCooked).toBe(3)
    expect(stats.timesRated).toBe(2)
    expect(stats.timesTooMuch).toBe(1)
    expect(stats.timesNotEnough).toBe(0)
  })

  it('does not credit a skipped slot carrying stale portion feedback', () => {
    const stats = statsFor(
      [plan('2026-01-05', 'accepted', [slot('m1', 'skipped', 'too_much')])],
      'm1',
    )
    expect(stats.timesRated).toBe(0)
    expect(stats.timesTooMuch).toBe(0)
  })

  it('keeps meals apart', () => {
    const plans = [plan('2026-01-05', 'accepted', [slot('m1', 'eaten'), slot('m2', 'skipped')])]
    expect(statsFor(plans, 'm1').timesCooked).toBe(1)
    expect(statsFor(plans, 'm2').timesSkipped).toBe(1)
  })
})

describe('portionWarning', () => {
  it('says nothing about a meal with no stats at all', () => {
    expect(portionWarning(undefined)).toBeNull()
  })

  it('stays quiet below the three-rated-cook floor, however lopsided', () => {
    expect(portionWarning(rated(2, 2))).toBeNull()
  })

  it('warns once a majority of three rated cooks was too much', () => {
    expect(portionWarning(rated(3, 2))).toMatch(/Too much 2 of 3/)
  })

  it('warns the other way for not enough', () => {
    expect(portionWarning(rated(3, 0, 2))).toMatch(/Not enough 2 of 3/)
  })

  it('needs a real majority, not a tie', () => {
    // 2 of 4 is half, not most — one heavy night in four is not a pattern.
    expect(portionWarning(rated(4, 2))).toBeNull()
    expect(portionWarning(rated(5, 3))).toMatch(/Too much 3 of 5/)
  })

  it('stays quiet when the ratings are mostly about right', () => {
    expect(portionWarning(rated(5, 1, 1))).toBeNull()
  })
})
