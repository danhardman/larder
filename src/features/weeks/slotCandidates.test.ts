import { describe, expect, it } from 'vitest'
import { SEED_MEALS } from '../../data/seedLibrary'
import type { Slot, WeekPlan } from '../../types'
import { candidatesFor } from './slotCandidates'

function slot(day: number, mealType: Slot['mealType'], mealId: string | null): Slot {
  return {
    day,
    mealType,
    mealId,
    mealName: mealId ?? '',
    locked: false,
    outcome: 'pending',
    skipReason: null,
    portionFeedback: null,
  }
}

// A July week: seasonal-only meals (Soup m5, Lasagne m8) are out.
const plan: WeekPlan = {
  id: 'p',
  weekStart: '2026-07-06',
  status: 'draft',
  seed: 1,
  thin: [],
  generatedBy: 'client',
  ticked: {},
  slots: [
    slot(0, 'lunch', 'm3'), // Chicken wraps, Monday lunch
    slot(0, 'dinner', 'm6'), // Chilli, Monday dinner
    slot(1, 'dinner', 'm7'), // Sausage pasta bake, Tuesday dinner
    slot(2, 'lunch', 'm4'), // Cheese toastie, Wednesday lunch
  ],
}

const ids = (slots: number) => candidatesFor(plan, slots, SEED_MEALS).map((m) => m.id)

describe('candidatesFor', () => {
  it('offers meals of the right type and season, keeping the current one', () => {
    const lunch = ids(3)
    expect(lunch).toContain('m4') // the slot's own meal stays
    expect(lunch).toContain('m2') // bacon sandwich, all seasons
    expect(lunch).not.toContain('m5') // soup is not a summer meal
    expect(lunch).not.toContain('m6') // dinner only
  })

  it('excludes meals already used elsewhere on the same day', () => {
    // Monday dinner: chicken wraps is Monday's lunch, so it's out.
    expect(ids(1)).not.toContain('m3')
    // Wednesday lunch has no conflict with Monday, so wraps are fine there.
    expect(ids(3)).toContain('m3')
  })

  it('excludes every other dinner in the week from a dinner slot', () => {
    const dinner = ids(1)
    expect(dinner).toContain('m6') // its own
    expect(dinner).not.toContain('m7') // Tuesday's dinner
    expect(dinner).toContain('m9')
  })

  it('returns nothing for an index off the end', () => {
    expect(candidatesFor(plan, 99, SEED_MEALS)).toEqual([])
  })
})
