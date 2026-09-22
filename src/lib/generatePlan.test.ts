import { describe, expect, it } from 'vitest'
import { blankSlots, generatePlan, eligible, isWeekendDay, rerollSlot, scoreDinner } from './generatePlan'
import { rngFrom } from './rng'
import { SEED_MEALS } from '../data/seedLibrary'
import type { Effort, Meal, Slot, WeekPlan } from '../types'

const base = {
  library: SEED_MEALS,
  history: [] as WeekPlan[],
  season: 'summer' as const,
  seed: 42,
  rotationSize: 2,
  recencyWindowWeeks: 2,
}

const dinners = (slots: Slot[]) => slots.filter((s) => s.mealType === 'dinner')

describe('generatePlan', () => {
  it('fills 7 days × 3 slots', () => {
    const { slots } = generatePlan(base)
    expect(slots).toHaveLength(21)
    expect(new Set(slots.map((s) => s.day)).size).toBe(7)
  })

  it('never repeats a dinner within the week', () => {
    const ids = dinners(generatePlan(base).slots).map((s) => s.mealId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never serves the same meal twice in one day', () => {
    for (const seed of [1, 2, 3, 42, 1234]) {
      const { slots } = generatePlan({ ...base, seed })
      for (let day = 0; day < 7; day++) {
        const ids = slots.filter((s) => s.day === day && s.mealId).map((s) => s.mealId)
        expect(new Set(ids).size, `day ${day}, seed ${seed}`).toBe(ids.length)
      }
    }
  })

  it('is deterministic for a given seed', () => {
    const a = generatePlan(base).slots.map((s) => s.mealId)
    const b = generatePlan(base).slots.map((s) => s.mealId)
    expect(a).toEqual(b)
    const c = generatePlan({ ...base, seed: 7 }).slots.map((s) => s.mealId)
    expect(c).not.toEqual(a)
  })

  it('honours the season filter', () => {
    const { slots } = generatePlan(base)
    const byId = new Map(SEED_MEALS.map((m) => [m.id, m]))
    for (const slot of slots) {
      if (!slot.mealId) continue
      expect(byId.get(slot.mealId)!.seasons).toContain('summer')
    }
  })

  it('repeats breakfast and lunch from a rotation of the configured size', () => {
    const { slots } = generatePlan({ ...base, rotationSize: 2 })
    const breakfasts = new Set(slots.filter((s) => s.mealType === 'breakfast').map((s) => s.mealId))
    expect(breakfasts.size).toBeLessThanOrEqual(2)
  })

  it('carries locked slots through untouched', () => {
    const first = generatePlan(base).slots
    const keep = first.map((s, i) => (i === 2 ? { ...s, locked: true } : s))
    const locked = keep[2]
    const again = generatePlan({ ...base, seed: 99, keep })
    const same = again.slots.find((s) => s.day === locked.day && s.mealType === locked.mealType)
    expect(same?.mealId).toBe(locked.mealId)
    expect(same?.locked).toBe(true)
  })

  it('carries a night we’re out through untouched, and doesn’t spend a dinner on it', () => {
    const first = generatePlan(base).slots
    const fridayDinner = first.findIndex((s) => s.day === 4 && s.mealType === 'dinner')
    const keep = first.map((s, i) =>
      i === fridayDinner
        ? { ...s, mealId: null, mealName: '', away: 'at_friends' as const, awayNote: null }
        : s,
    )

    const { slots, thin } = generatePlan({ ...base, seed: 99, keep })
    const friday = slots.find((s) => s.day === 4 && s.mealType === 'dinner')!
    expect(friday.away).toBe('at_friends')
    expect(friday.mealId).toBeNull()
    // The empty slot is a choice, not a shortage.
    expect(thin).not.toContain('dinners')
    // Every other night still gets its own dinner.
    const rest = dinners(slots).filter((s) => s.day !== 4)
    expect(rest.every((s) => s.mealId)).toBe(true)
    expect(new Set(rest.map((s) => s.mealId)).size).toBe(6)
  })

  it('resets last week’s outcome on a slot it carries through', () => {
    const first = generatePlan(base).slots
    const keep = first.map((s, i) =>
      i === 2 ? { ...s, locked: true, outcome: 'eaten' as const, portionFeedback: 'too_much' as const } : s,
    )
    const again = generatePlan({ ...base, seed: 99, keep })
    expect(again.slots[2].outcome).toBe('pending')
    expect(again.slots[2].portionFeedback).toBeNull()
  })

  it('reports a thin library rather than inventing meals', () => {
    const onlyDinner: Meal[] = [SEED_MEALS.find((m) => m.id === 'm6')!]
    const { slots, thin } = generatePlan({ ...base, library: onlyDinner })
    expect(thin).toContain('breakfasts')
    expect(slots.filter((s) => s.mealType === 'breakfast').every((s) => s.mealId === null)).toBe(true)
  })

  it('excludes archived meals', () => {
    const library = SEED_MEALS.map((m) => (m.id === 'm6' ? { ...m, archived: true } : m))
    expect(eligible(library, 'dinner', 'summer').some((m) => m.id === 'm6')).toBe(false)
  })
})

describe('blankSlots', () => {
  it('is a full week of empty, un-named slots in the generator’s own order', () => {
    const slots = blankSlots()
    expect(slots).toHaveLength(21)
    expect(slots.every((s) => s.mealId === null && s.mealName === '' && s.away === null)).toBe(true)
    // The index of a slot is its identity everywhere — a marking written against a
    // blank week has to land on the same slot once the week is generated.
    const generated = generatePlan(base).slots
    expect(slots.map((s) => `${s.day}${s.mealType}`)).toEqual(
      generated.map((s) => `${s.day}${s.mealType}`),
    )
  })
})

describe('rerollSlot', () => {
  it('returns a meal that isn’t already a dinner this week', () => {
    const { slots } = generatePlan(base)
    const index = slots.findIndex((s) => s.mealType === 'dinner')
    const used = new Set(dinners(slots).map((s) => s.mealId))
    const pick = rerollSlot(slots, index, SEED_MEALS, 'summer', rngFrom(1))
    if (pick) expect(used.has(pick.id)).toBe(false)
  })

  it('avoids what’s already on the plate that day', () => {
    const { slots } = generatePlan(base)
    const index = slots.findIndex((s) => s.mealType === 'dinner' && s.day === 0)
    const sameDay = new Set(slots.filter((s) => s.day === 0 && s.mealId).map((s) => s.mealId))
    const pick = rerollSlot(slots, index, SEED_MEALS, 'summer', rngFrom(3))
    if (pick) expect(sameDay.has(pick.id)).toBe(false)
  })

  it('returns null when the library has nothing left', () => {
    const slots = generatePlan(base).slots
    const index = slots.findIndex((s) => s.mealType === 'dinner')
    const library = SEED_MEALS.filter((m) => m.id === slots[index].mealId)
    expect(rerollSlot(slots, index, library, 'summer', rngFrom(1))).toBeNull()
  })
})

describe('scoreDinner', () => {
  const emptyTally = () => ({ proteins: {}, carbs: {}, prevProtein: null })
  const withEffort = (id: string, effort?: Effort): Meal => ({
    id,
    name: id,
    mealTypes: ['dinner'],
    protein: 'chicken',
    carbBase: 'rice',
    seasons: ['spring', 'summer', 'autumn', 'winter'],
    ingredients: [],
    effort,
    archived: false,
  })
  // No jitter, so the numbers under test are the only thing moving.
  const score = (meal: Meal, isWeekend: boolean, tally = emptyTally()) =>
    scoreDinner(meal, tally, new Set<string>(), 0, isWeekend)

  it('treats Saturday and Sunday as the weekend', () => {
    expect([0, 1, 2, 3, 4].map(isWeekendDay)).toEqual([false, false, false, false, false])
    expect([5, 6].map(isWeekendDay)).toEqual([true, true])
  })

  it('prefers quick over involved on a weekday', () => {
    expect(score(withEffort('q', 'quick'), false)).toBeGreaterThan(
      score(withEffort('i', 'involved'), false),
    )
  })

  it('prefers involved over quick at the weekend', () => {
    expect(score(withEffort('i', 'involved'), true)).toBeGreaterThan(
      score(withEffort('q', 'quick'), true),
    )
  })

  it('scores an unset effort the same as normal', () => {
    expect(score(withEffort('u', undefined), false)).toBe(score(withEffort('n', 'normal'), false))
    expect(score(withEffort('u', undefined), true)).toBe(score(withEffort('n', 'normal'), true))
  })

  it('lets variety outweigh the effort tilt', () => {
    // A quick meal on a weekday, but its protein is already on the plate twice.
    const repeated = { proteins: { chicken: 2 }, carbs: {}, prevProtein: null }
    expect(score(withEffort('q', 'quick'), false, repeated)).toBeLessThan(
      score(withEffort('i', 'involved'), false),
    )
  })
})
