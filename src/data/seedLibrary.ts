/**
 * The starter library a new household gets. Data, not logic: `state/storage.ts`
 * loads it on first run, and the Stage 2 seed script writes it to the emulator.
 */

import type { CarbBase, Meal, MealIngredient, MealType, Protein, Season, Unit } from '../types'
import { SEASONS } from '../types'

const ALL_SEASONS: Season[] = SEASONS

function ing(name: string, quantity: number, unit: Unit): MealIngredient {
  return { ingredientId: name.toLowerCase(), name, quantity, unit }
}

function meal(
  id: string,
  name: string,
  mealTypes: MealType[],
  protein: Protein,
  carbBase: CarbBase,
  seasons: Season[],
  ingredients: MealIngredient[],
): Meal {
  return { id, name, mealTypes, protein, carbBase, seasons, ingredients, archived: false }
}

/**
 * A starting library so the first plan has something to work with. Everything
 * here is editable and deletable — it's a seed, not a fixture.
 */
export const SEED_MEALS: Meal[] = [
  meal('m1', 'Cereal', ['breakfast'], 'none', 'grain', ALL_SEASONS, [
    ing('granola', 500, 'g'),
    ing('milk', 2, 'l'),
  ]),
  meal('m2', 'Bacon sandwich', ['breakfast', 'lunch'], 'pork', 'bread', ALL_SEASONS, [
    ing('bacon rashers', 8, 'piece'),
    ing('bread', 1, 'pack'),
  ]),
  meal('m3', 'Chicken wraps', ['lunch', 'dinner'], 'chicken', 'bread', ALL_SEASONS, [
    ing('chicken breast', 400, 'g'),
    ing('tortilla wraps', 8, 'piece'),
    ing('salad leaves', 1, 'pack'),
  ]),
  meal('m4', 'Cheese toastie', ['lunch'], 'veg', 'bread', ALL_SEASONS, [
    ing('cheddar', 250, 'g'),
    ing('bread', 1, 'pack'),
  ]),
  meal('m5', 'Soup & bread', ['lunch'], 'veg', 'bread', ['autumn', 'winter', 'spring'], [
    ing('vegetable soup', 3, 'tin'),
    ing('bread', 1, 'pack'),
  ]),
  meal('m6', 'Chilli', ['dinner'], 'beef', 'rice', ALL_SEASONS, [
    ing('beef mince', 500, 'g'),
    ing('kidney beans', 2, 'tin'),
    ing('chopped tomatoes', 2, 'tin'),
    ing('rice', 300, 'g'),
    ing('bell peppers', 2, 'piece'),
  ]),
  meal('m7', 'Sausage pasta bake', ['dinner'], 'pork', 'pasta', ALL_SEASONS, [
    ing('sausages', 8, 'piece'),
    ing('pasta', 500, 'g'),
    ing('chopped tomatoes', 2, 'tin'),
    ing('cheddar', 150, 'g'),
  ]),
  meal('m8', 'Lasagne', ['dinner'], 'beef', 'pasta', ['autumn', 'winter', 'spring'], [
    ing('beef mince', 500, 'g'),
    ing('lasagne sheets', 1, 'pack'),
    ing('chopped tomatoes', 2, 'tin'),
    ing('cheddar', 200, 'g'),
    ing('milk', 500, 'ml'),
  ]),
  meal('m9', 'Spaghetti bolognese', ['dinner'], 'beef', 'pasta', ALL_SEASONS, [
    ing('beef mince', 500, 'g'),
    ing('spaghetti', 400, 'g'),
    ing('chopped tomatoes', 2, 'tin'),
  ]),
  meal('m10', 'Katsu curry', ['dinner'], 'chicken', 'rice', ALL_SEASONS, [
    ing('chicken breast', 500, 'g'),
    ing('rice', 300, 'g'),
    ing('katsu sauce', 1, 'pack'),
  ]),
  meal('m11', 'Jacket potatoes', ['lunch', 'dinner'], 'veg', 'potato', ALL_SEASONS, [
    ing('baking potatoes', 4, 'piece'),
    ing('baked beans', 2, 'tin'),
    ing('cheddar', 150, 'g'),
  ]),
  meal('m12', 'Fish pie', ['dinner'], 'fish', 'potato', ALL_SEASONS, [
    ing('fish pie mix', 500, 'g'),
    ing('potatoes', 1, 'kg'),
    ing('milk', 400, 'ml'),
  ]),
]
