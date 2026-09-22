import { describe, expect, it } from 'vitest'
import { buildShoppingList, formatShoppingList, lineKey } from './shoppingList'
import type { Meal, Slot } from '../types'

function meal(id: string, name: string, ingredients: Meal['ingredients']): Meal {
  return {
    id,
    name,
    mealTypes: ['dinner'],
    protein: 'chicken',
    carbBase: 'rice',
    seasons: ['spring', 'summer', 'autumn', 'winter'],
    ingredients,
    archived: false,
  }
}

function slot(day: number, mealId: string, mealName: string): Slot {
  return {
    day,
    mealType: 'dinner',
    mealId,
    mealName,
    locked: false,
    outcome: 'pending',
    skipReason: null,
    portionFeedback: null,
  }
}

const fajitas = meal('a', 'Chicken fajitas', [
  { ingredientId: 'chicken', name: 'chicken thighs', quantity: 300, unit: 'g' },
  { ingredientId: 'peppers', name: 'bell peppers', quantity: 3, unit: 'piece' },
])
const katsu = meal('b', 'Katsu curry', [
  { ingredientId: 'chicken', name: 'chicken thighs', quantity: 300, unit: 'g' },
])
const bacon = meal('c', 'Bacon sandwich', [
  { ingredientId: 'bacon', name: 'bacon rashers', quantity: 2, unit: 'piece' },
])

describe('buildShoppingList', () => {
  it('buys nothing for a night we’re out', () => {
    const away: Slot = { ...slot(1, 'b', 'Katsu curry'), mealId: null, mealName: '', away: 'at_friends' }
    const lines = buildShoppingList([slot(0, 'a', 'Chicken fajitas'), away], [fajitas, katsu])
    expect(lines.find((l) => l.name === 'chicken thighs')!.total).toBe(300)
  })

  it('buys nothing for an away slot that still carries a meal', () => {
    const away: Slot = { ...slot(1, 'b', 'Katsu curry'), away: 'ate_out' }
    const lines = buildShoppingList([slot(0, 'a', 'Chicken fajitas'), away], [fajitas, katsu])
    expect(lines.find((l) => l.name === 'chicken thighs')!.total).toBe(300)
  })

  it('sums matching ingredient + unit across meals', () => {
    const lines = buildShoppingList([slot(0, 'a', 'Chicken fajitas'), slot(1, 'b', 'Katsu curry')], [
      fajitas,
      katsu,
    ])
    const chicken = lines.find((l) => l.name === 'chicken thighs')!
    expect(chicken.total).toBe(600)
    expect(chicken.unit).toBe('g')
    expect(chicken.contributions).toEqual([
      { mealName: 'Chicken fajitas', each: 300, times: 1 },
      { mealName: 'Katsu curry', each: 300, times: 1 },
    ])
  })

  it('keeps incompatible units on separate lines', () => {
    const mixed = meal('d', 'Odd one', [
      { ingredientId: 'chicken', name: 'chicken thighs', quantity: 2, unit: 'pack' },
    ])
    const lines = buildShoppingList([slot(0, 'a', 'Chicken fajitas'), slot(1, 'd', 'Odd one')], [
      fajitas,
      mixed,
    ])
    const chickenLines = lines.filter((l) => l.name === 'chicken thighs')
    expect(chickenLines).toHaveLength(2)
    expect(chickenLines.map((l) => l.unit).sort()).toEqual(['g', 'pack'])
  })

  it('counts a repeated meal once per appearance', () => {
    const slots = [0, 1, 2, 3].map((d) => slot(d, 'c', 'Bacon sandwich'))
    const [line] = buildShoppingList(slots, [bacon])
    expect(line.total).toBe(8)
    expect(line.contributions).toEqual([{ mealName: 'Bacon sandwich', each: 2, times: 4 }])
  })

  it('sums by catalog id, so differently-cased copies of a name are one line', () => {
    const shouty = meal('e', 'Shouty fajitas', [
      { ingredientId: 'chicken', name: 'Chicken Thighs', quantity: 200, unit: 'g' },
    ])
    const lines = buildShoppingList([slot(0, 'a', 'Chicken fajitas'), slot(1, 'e', 'Shouty fajitas')], [
      fajitas,
      shouty,
    ])
    const chicken = lines.filter((l) => l.ingredientId === 'chicken')
    expect(chicken).toHaveLength(1)
    expect(chicken[0].total).toBe(500)
    expect(lineKey(chicken[0])).toBe('chicken|g')
  })

  it('keeps the same name on separate lines when the ids differ', () => {
    const other = meal('f', 'Other chicken', [
      { ingredientId: 'chicken-2', name: 'chicken thighs', quantity: 100, unit: 'g' },
    ])
    const lines = buildShoppingList([slot(0, 'a', 'Chicken fajitas'), slot(1, 'f', 'Other chicken')], [
      fajitas,
      other,
    ])
    expect(lines.filter((l) => l.name === 'chicken thighs')).toHaveLength(2)
  })

  it('falls back to the name for a row with no id', () => {
    const legacy = meal('g', 'Legacy', [{ ingredientId: '', name: 'Eggs', quantity: 6, unit: 'piece' }])
    const [line] = buildShoppingList([slot(0, 'g', 'Legacy')], [legacy])
    expect(line.ingredientId).toBe('eggs')
  })

  it('ignores slots with no meal', () => {
    const empty: Slot = { ...slot(0, 'a', 'x'), mealId: null, mealName: 'Nothing suitable' }
    expect(buildShoppingList([empty], [fajitas])).toEqual([])
  })
})

describe('formatShoppingList', () => {
  const lines = buildShoppingList(
    [slot(0, 'a', 'Chicken fajitas'), slot(1, 'b', 'Katsu curry')],
    [fajitas, katsu],
  )

  it('is one line per thing to buy, under a heading naming the week', () => {
    expect(formatShoppingList(lines, '13 Jul')).toBe(
      [
        'Shopping list — w/c 13 Jul',
        '3 piece — bell peppers',
        '600 g — chicken thighs',
        '',
      ].join('\n'),
    )
  })

  it('never emits a blank line — every line has to become one iOS Notes checkbox', () => {
    const text = formatShoppingList(lines, '13 Jul')
    expect(text.trimEnd().split('\n').filter((l) => !l.trim())).toEqual([])
  })

  it('leaves the per-meal breakdown on screen, out of the clipboard', () => {
    expect(formatShoppingList(lines, '13 Jul')).not.toContain('↳')
  })
})
