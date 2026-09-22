/** The meal library: what a household can cook, and how each meal is classified. */

export type MealType = 'breakfast' | 'lunch' | 'dinner'
export type Protein = 'chicken' | 'beef' | 'pork' | 'fish' | 'veg' | 'other' | 'none'
export type CarbBase = 'pasta' | 'rice' | 'potato' | 'bread' | 'grain' | 'none'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'piece' | 'pack' | 'tin' | 'bunch' | 'other'
export type Effort = 'quick' | 'normal' | 'involved'

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner']
export const PROTEINS: Protein[] = ['chicken', 'beef', 'pork', 'fish', 'veg', 'other', 'none']
export const CARB_BASES: CarbBase[] = ['pasta', 'rice', 'potato', 'bread', 'grain', 'none']
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']
export const UNITS: Unit[] = ['g', 'kg', 'ml', 'l', 'piece', 'pack', 'tin', 'bunch', 'other']

export interface MealIngredient {
  ingredientId: string
  /** Denormalised copy of the catalog name, so a meal renders in one read. */
  name: string
  quantity: number
  unit: Unit
}

export interface Meal {
  id: string
  name: string
  mealTypes: MealType[]
  protein: Protein
  carbBase: CarbBase
  seasons: Season[]
  ingredients: MealIngredient[]
  effort?: Effort
  archived: boolean
}

/** Catalog entry. Not used yet — Stage 4 replaces the name-derived ids with real docs. */
export interface Ingredient {
  id: string
  name: string
  nameLower: string
}
