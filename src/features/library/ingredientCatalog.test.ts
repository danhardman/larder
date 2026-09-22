import { describe, expect, it } from 'vitest'
import type { Ingredient, Meal } from '../../types'
import { rankIngredients, usageCount } from './ingredientCatalog'

function meal(id: string, ids: string[], archived = false): Meal {
  return {
    id,
    name: id,
    mealTypes: ['dinner'],
    protein: 'none',
    carbBase: 'none',
    seasons: ['summer'],
    ingredients: ids.map((ingredientId) => ({ ingredientId, name: ingredientId, quantity: 1, unit: 'g' })),
    archived,
  }
}

const entry = (id: string, name = id): Ingredient => ({ id, name, nameLower: name.toLowerCase() })

const catalog = [entry('rice'), entry('garlic'), entry('onion'), entry('saffron')]

describe('rankIngredients', () => {
  it('orders most-used first, then alphabetically, unused last', () => {
    const ranked = rankIngredients(catalog, [
      meal('a', ['onion', 'rice']),
      meal('b', ['onion', 'garlic']),
      meal('c', ['onion', 'garlic', 'rice']),
    ])
    expect(ranked.map((i) => i.id)).toEqual(['onion', 'garlic', 'rice', 'saffron'])
  })

  it('counts a meal once however many rows use the same ingredient', () => {
    const ranked = rankIngredients([entry('rice'), entry('garlic')], [
      meal('a', ['rice', 'rice']),
      meal('b', ['garlic']),
      meal('c', ['garlic']),
    ])
    expect(ranked.map((i) => i.id)).toEqual(['garlic', 'rice'])
  })

  it('does not mutate the catalog it was given', () => {
    const input = [entry('b'), entry('a')]
    rankIngredients(input, [])
    expect(input.map((i) => i.id)).toEqual(['b', 'a'])
  })
})

describe('usageCount', () => {
  it('counts meals, including archived ones', () => {
    const meals = [meal('a', ['rice']), meal('b', ['rice', 'garlic'], true), meal('c', ['garlic'])]
    expect(usageCount('rice', meals)).toBe(2)
    expect(usageCount('saffron', meals)).toBe(0)
  })
})
