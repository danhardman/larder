import type { Meal } from '../../types'

/**
 * Ingredient names already used across the library, most common first —
 * the editor's autocomplete. Stage 4 replaces this with a real catalog.
 */
export function ingredientCatalog(meals: Meal[]): string[] {
  const counts = new Map<string, number>()
  for (const meal of meals) {
    for (const item of meal.ingredients) {
      if (item.name) counts.set(item.name, (counts.get(item.name) ?? 0) + 1)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
}
