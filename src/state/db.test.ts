import { describe, expect, it, vi } from 'vitest'

// `db.ts` imports the initialised Firestore instance at module scope; the mappers
// under test never touch it, so stub the module rather than boot the SDK in node.
vi.mock('./firebase', () => ({ db: {} }))

const { memberProfile, normaliseEmail, toHousehold, toIngredient, toInvite, toMeal, toPlan, toSettings } =
  await import('./db')

describe('toPlan', () => {
  it('fills the Stage 2 fields an older document may lack', () => {
    const plan = toPlan('2026-09-21', {
      id: 'abc',
      weekStart: '2026-09-21',
      slots: [],
      status: 'accepted',
      seed: 7,
    })
    expect(plan).toEqual({
      id: 'abc',
      weekStart: '2026-09-21',
      slots: [],
      status: 'accepted',
      seed: 7,
      thin: [],
      generatedBy: 'client',
      ticked: {},
    })
  })

  it('falls back to the document id for id and weekStart', () => {
    const plan = toPlan('2026-09-21', {})
    expect(plan.id).toBe('2026-09-21')
    expect(plan.weekStart).toBe('2026-09-21')
    expect(plan.status).toBe('draft')
  })

  it('keeps persisted thin and ticked as written', () => {
    const plan = toPlan('w', { thin: ['breakfasts'], ticked: { 'eggs|piece': true } })
    expect(plan.thin).toEqual(['breakfasts'])
    expect(plan.ticked).toEqual({ 'eggs|piece': true })
  })
})

describe('toMeal', () => {
  it('defaults archived to false and leaves effort undefined', () => {
    const meal = toMeal('m1', { name: 'Toast', mealTypes: ['breakfast'] })
    expect(meal.archived).toBe(false)
    expect(meal.effort).toBeUndefined()
    expect(meal.ingredients).toEqual([])
  })
})

describe('toIngredient', () => {
  it('derives nameLower when a hand-written document lacks it', () => {
    expect(toIngredient('i1', { name: 'Chicken Thighs' })).toEqual({
      id: 'i1',
      name: 'Chicken Thighs',
      nameLower: 'chicken thighs',
    })
  })

  it('keeps a stored nameLower and defaults a missing name to empty', () => {
    expect(toIngredient('i1', { name: 'Rice', nameLower: 'rice' }).nameLower).toBe('rice')
    expect(toIngredient('i2', {})).toEqual({ id: 'i2', name: '', nameLower: '' })
  })
})

describe('toHousehold / toSettings', () => {
  it('merges partial settings over the defaults', () => {
    expect(toSettings({ rotationSize: 3 })).toEqual({ recencyWindowWeeks: 2, rotationSize: 3 })
    expect(toSettings(undefined)).toEqual({ recencyWindowWeeks: 2, rotationSize: 2 })
  })

  it('never returns an undefined member list', () => {
    expect(toHousehold('h', {}).memberUids).toEqual([])
  })

  it('defaults the members map a Stage 2 household lacks', () => {
    expect(toHousehold('h', { memberUids: ['a'] }).members).toEqual({})
    expect(toHousehold('h', { members: { a: { name: 'A', email: 'a@x' } } }).members).toEqual({
      a: { name: 'A', email: 'a@x' },
    })
  })
})

describe('invites', () => {
  it('toInvite falls back to the document id for the email', () => {
    expect(toInvite('b@x', { householdId: 'h', householdName: 'Ours', invitedBy: 'a' })).toEqual({
      email: 'b@x',
      householdId: 'h',
      householdName: 'Ours',
      invitedBy: 'a',
    })
  })

  it('normaliseEmail trims and lower-cases, matching the rules', () => {
    expect(normaliseEmail('  Bob@Example.COM ')).toBe('bob@example.com')
  })

  it('memberProfile falls back to the email when there is no display name', () => {
    expect(memberProfile({ displayName: null, email: 'b@x' })).toEqual({ name: 'b@x', email: 'b@x' })
    expect(memberProfile({ displayName: 'Bob', email: 'b@x' })).toEqual({ name: 'Bob', email: 'b@x' })
  })
})
