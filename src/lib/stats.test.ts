import { describe, expect, it } from 'vitest'
import { mealsInUse } from './stats'
import type { Slot, WeekPlan } from '../types'

function slot(mealId: string | null): Slot {
  return {
    day: 0,
    mealType: 'dinner',
    mealId,
    mealName: mealId ?? '',
    locked: false,
    outcome: 'pending',
    skipReason: null,
    portionFeedback: null,
  }
}

function plan(weekStart: string, status: WeekPlan['status'], mealIds: (string | null)[]): WeekPlan {
  return { id: weekStart, weekStart, slots: mealIds.map(slot), status, seed: 1 }
}

describe('mealsInUse', () => {
  it('collects meal ids from drafts as well as accepted weeks', () => {
    const used = mealsInUse([
      plan('2026-01-05', 'accepted', ['m1', 'm2']),
      plan('2026-01-12', 'draft', ['m3']),
    ])
    expect([...used].sort()).toEqual(['m1', 'm2', 'm3'])
  })

  it('ignores empty slots', () => {
    expect(mealsInUse([plan('2026-01-05', 'accepted', [null, null])]).size).toBe(0)
  })

  it('is empty when there are no plans', () => {
    expect(mealsInUse([]).size).toBe(0)
  })
})
