import { describe, expect, it } from 'vitest'
import type { Ingredient, MealIngredient } from '../../types'
import { resolveIngredients } from './resolveIngredients'

const row = (name: string, ingredientId = '', quantity = 1): MealIngredient => ({
  ingredientId,
  name,
  quantity,
  unit: 'g',
})

const catalog: Ingredient[] = [
  { id: 'i-chicken', name: 'Chicken Thighs', nameLower: 'chicken thighs' },
  { id: 'i-rice', name: 'rice', nameLower: 'rice' },
]

function counter() {
  let n = 0
  return () => `new-${++n}`
}

describe('resolveIngredients', () => {
  it('reuses an existing entry by case-insensitive name and takes its spelling', () => {
    const { ingredients, created } = resolveIngredients([row('  chicken thighs ', '', 300)], catalog, counter())
    expect(created).toEqual([])
    expect(ingredients).toEqual([{ ingredientId: 'i-chicken', name: 'Chicken Thighs', quantity: 300, unit: 'g' }])
  })

  it('creates an entry for an unknown name, trimmed', () => {
    const { ingredients, created } = resolveIngredients([row(' Bell peppers ')], catalog, counter())
    expect(created).toEqual([{ id: 'new-1', name: 'Bell peppers', nameLower: 'bell peppers' }])
    expect(ingredients[0]).toMatchObject({ ingredientId: 'new-1', name: 'Bell peppers' })
  })

  it('creates one entry when two rows share a new name', () => {
    const { ingredients, created } = resolveIngredients([row('Onion'), row('onion')], catalog, counter())
    expect(created).toHaveLength(1)
    expect(ingredients.map((i) => i.ingredientId)).toEqual(['new-1', 'new-1'])
    expect(ingredients.map((i) => i.name)).toEqual(['Onion', 'Onion'])
  })

  it('resolves by name, not by the id a row carried in', () => {
    const { ingredients, created } = resolveIngredients([row('rice', 'i-chicken')], catalog, counter())
    expect(created).toEqual([])
    expect(ingredients[0].ingredientId).toBe('i-rice')
  })

  it('drops blank rows and coerces quantities', () => {
    const rows = [row(''), row('   '), { ...row('rice'), quantity: Number.NaN }]
    const { ingredients } = resolveIngredients(rows, catalog, counter())
    expect(ingredients).toEqual([{ ingredientId: 'i-rice', name: 'rice', quantity: 0, unit: 'g' }])
  })
})
