import type { Ingredient, Meal } from '../../types'

/** How many meals use an ingredient — archived ones included, since they can come back. */
export function usageCount(ingredientId: string, meals: Meal[]): number {
  let count = 0
  for (const meal of meals) {
    if (meal.ingredients.some((i) => i.ingredientId === ingredientId)) count += 1
  }
  return count
}

/**
 * The catalog in the order the editor offers it: most-used first, then
 * alphabetical, so the quick-add chips are the household's staples-that-aren't.
 */
export function rankIngredients(catalog: Ingredient[], meals: Meal[]): Ingredient[] {
  const counts = new Map<string, number>()
  for (const meal of meals) {
    for (const id of new Set(meal.ingredients.map((i) => i.ingredientId))) {
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }
  const uses = (entry: Ingredient) => counts.get(entry.id) ?? 0
  return catalog.slice().sort((a, b) => uses(b) - uses(a) || a.name.localeCompare(b.name))
}
