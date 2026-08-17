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

export interface Ingredient {
  id: string
  name: string
  nameLower: string
}

export type Outcome = 'pending' | 'eaten' | 'skipped'
export type SkipReason = 'ate_out' | 'takeaway' | 'at_friends' | 'other'
export type PortionFeedback = 'too_much' | 'about_right' | 'not_enough'

export interface Slot {
  /** 0 = Monday. */
  day: number
  mealType: MealType
  mealId: string | null
  /** Denormalised so a historical week still renders if the meal is renamed. */
  mealName: string
  locked: boolean
  outcome: Outcome
  skipReason: SkipReason | null
  skipNote?: string | null
  portionFeedback: PortionFeedback | null
}

export interface WeekPlan {
  id: string
  /** ISO date of the Monday this plan covers — also the recency sort key. */
  weekStart: string
  slots: Slot[]
  status: 'draft' | 'accepted'
  /** RNG seed, persisted so a baffling plan can be reproduced. */
  seed: number
}

export interface Settings {
  recencyWindowWeeks: number
  rotationSize: number
}

export const SKIP_REASONS: { value: SkipReason; label: string }[] = [
  { value: 'ate_out', label: 'We ate out' },
  { value: 'takeaway', label: 'Takeaway won' },
  { value: 'at_friends', label: 'At a friend’s' },
  { value: 'other', label: 'Something else' },
]

export const SKIP_REASON_SHORT: Record<SkipReason, string> = {
  ate_out: 'Ate out',
  takeaway: 'Takeaway',
  at_friends: 'At a friend’s',
  other: 'Skipped',
}

export const PORTION_OPTIONS: { value: PortionFeedback; label: string }[] = [
  { value: 'too_much', label: 'Too much' },
  { value: 'about_right', label: 'About right' },
  { value: 'not_enough', label: 'Not enough' },
]

export const PORTION_SHORT: Record<PortionFeedback, string> = {
  too_much: 'Too much',
  about_right: 'Ate it',
  not_enough: 'Not enough',
}
