import { newId } from '../../lib/ids'
import type { Ingredient, MealIngredient } from '../../types'

export interface ResolvedIngredients {
  /** The rows to store on the meal, every one pointing at a catalog entry. */
  ingredients: MealIngredient[]
  /** Catalog entries the meal introduces — written in the same batch as the meal. */
  created: Ingredient[]
}

/**
 * Turn the editor's rows into catalog-backed ingredients (spec §3). Identity is the
 * lower-cased, trimmed name: a row matching an existing entry takes that entry's id
 * and its spelling, so "chicken thighs" and "Chicken Thighs" are one ingredient and
 * one shopping line. Anything else becomes a new entry, once per name even if two
 * rows share it. Pure: `makeId` is injectable for tests.
 */
export function resolveIngredients(
  rows: MealIngredient[],
  catalog: Ingredient[],
  makeId: () => string = newId,
): ResolvedIngredients {
  const byLower = new Map(catalog.map((entry) => [entry.nameLower, entry]))
  const created: Ingredient[] = []
  const ingredients: MealIngredient[] = []

  for (const row of rows) {
    const name = row.name.trim()
    if (!name) continue
    const nameLower = name.toLowerCase()
    let entry = byLower.get(nameLower)
    if (!entry) {
      entry = { id: makeId(), name, nameLower }
      byLower.set(nameLower, entry)
      created.push(entry)
    }
    ingredients.push({
      ingredientId: entry.id,
      name: entry.name,
      quantity: Number(row.quantity) || 0,
      unit: row.unit,
    })
  }

  return { ingredients, created }
}
