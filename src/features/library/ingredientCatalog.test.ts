import { describe, expect, it } from 'vitest'
import type { Meal } from '../../types'
import { ingredientCatalog } from './ingredientCatalog'

function meal(id: string, names: string[]): Meal {
  return {
    id,
    name: id,
    mealTypes: ['dinner'],
    protein: 'none',
    carbBase: 'none',
    seasons: ['summer'],
    ingredients: names.map((name) => ({ ingredientId: name, name, quantity: 1, unit: 'g' })),
    archived: false,
  }
}

describe('ingredientCatalog', () => {
  it('lists each name once, most-used first', () => {
    const catalog = ingredientCatalog([
      meal('a', ['onion', 'rice']),
      meal('b', ['onion', 'garlic']),
      meal('c', ['onion', 'garlic', 'rice']),
    ])
    expect(catalog[0]).toBe('onion')
    expect(catalog).toHaveLength(3)
    expect(new Set(catalog)).toEqual(new Set(['onion', 'garlic', 'rice']))
  })

  it('ignores blank names', () => {
    expect(ingredientCatalog([meal('a', ['', 'salt'])])).toEqual(['salt'])
  })
})
