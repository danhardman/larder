import { rngFrom, shuffled, type Rng } from './rng'
import { MEAL_TYPES, type Meal, type MealType, type Season, type Slot, type WeekPlan } from '../types'

export interface GenerateInput {
  library: Meal[]
  /** Accepted weeks, most recent first or not — order doesn't matter. */
  history: WeekPlan[]
  season: Season
  seed: number
  rotationSize: number
  recencyWindowWeeks: number
  /** Existing slots; any marked `locked` are carried through untouched. */
  keep?: Slot[]
}

export interface GenerateResult {
  slots: Slot[]
  /** Meal types the library couldn't comfortably cover, e.g. ['breakfasts']. */
  thin: string[]
}

const EMPTY_SLOT_NAME = 'Nothing suitable'

/** Hard filters from the spec: right meal type, in season, not archived. */
export function eligible(library: Meal[], type: MealType, season: Season): Meal[] {
  return library.filter((m) => !m.archived && m.mealTypes.includes(type) && m.seasons.includes(season))
}

/** Meal ids used as dinners inside the recency window. */
export function recentDinnerIds(history: WeekPlan[], recencyWindowWeeks: number): Set<string> {
  const recent = history
    .filter((p) => p.status === 'accepted')
    .slice()
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))
    .slice(0, Math.max(0, recencyWindowWeeks))
  const ids = new Set<string>()
  for (const plan of recent) {
    for (const slot of plan.slots) {
      if (slot.mealType === 'dinner' && slot.mealId) ids.add(slot.mealId)
    }
  }
  return ids
}

interface Tally {
  proteins: Record<string, number>
  carbs: Record<string, number>
  prevProtein: string | null
}

/** Soft constraints — dinners only. Higher is better. */
export function scoreDinner(meal: Meal, tally: Tally, recent: Set<string>, jitter: number): number {
  let score = jitter
  const protein = tally.proteins[meal.protein] ?? 0
  const carb = tally.carbs[meal.carbBase] ?? 0
  // Penalise a 3rd+ occurrence of the same protein / carb base this week.
  if (protein >= 2) score -= 3 * (protein - 1)
  if (carb >= 2) score -= 3 * (carb - 1)
  if (tally.prevProtein && tally.prevProtein === meal.protein) score -= 1.5
  if (recent.has(meal.id)) score -= 2.5
  return score
}

function countMeal(tally: Tally, meal: Meal) {
  tally.proteins[meal.protein] = (tally.proteins[meal.protein] ?? 0) + 1
  tally.carbs[meal.carbBase] = (tally.carbs[meal.carbBase] ?? 0) + 1
  tally.prevProtein = meal.protein
}

function emptySlot(day: number, mealType: MealType): Slot {
  return {
    day,
    mealType,
    mealId: null,
    mealName: EMPTY_SLOT_NAME,
    locked: false,
    outcome: 'pending',
    skipReason: null,
    portionFeedback: null,
  }
}

function slotFor(day: number, mealType: MealType, meal: Meal | null): Slot {
  if (!meal) return emptySlot(day, mealType)
  return { ...emptySlot(day, mealType), mealId: meal.id, mealName: meal.name }
}

/**
 * Filter → score → greedy fill. Breakfast and lunch repeat by design: a small
 * rotation is drawn for the week and cycled across the days.
 */
export function generatePlan(input: GenerateInput): GenerateResult {
  const { library, history, season, seed, rotationSize, recencyWindowWeeks, keep = [] } = input
  const rng = rngFrom(seed)
  const recent = recentDinnerIds(history, recencyWindowWeeks)
  const byId = new Map(library.map((m) => [m.id, m]))
  const thin = new Set<string>()

  const lockedAt = (day: number, type: MealType) =>
    keep.find((s) => s.day === day && s.mealType === type && s.locked) ?? null

  const rotations: Record<string, Meal[]> = {}
  const spoken = new Set<string>()
  for (const type of ['breakfast', 'lunch'] as const) {
    const all = eligible(library, type, season)
    if (all.length === 0) thin.add(`${type}s`)
    // Lunch prefers meals the breakfast rotation hasn't already claimed, so the
    // same thing doesn't land twice in one day.
    const fresh = all.filter((m) => !spoken.has(m.id))
    const pool = shuffled(fresh.length ? fresh : all, rng)
    const rotation = pool.slice(0, Math.max(1, Math.min(rotationSize, pool.length)))
    for (const meal of rotation) spoken.add(meal.id)
    rotations[type] = rotation
  }

  const dinnerPool = eligible(library, 'dinner', season)
  const usedDinners = new Set<string>()
  const tally: Tally = { proteins: {}, carbs: {}, prevProtein: null }
  const usedByDay: Set<string>[] = Array.from({ length: 7 }, () => new Set<string>())

  // Dinners first: they're the scarce resource (no repeats all week), so the
  // flexible breakfast/lunch rotation is what bends to avoid a same-day clash.
  const dinners: (Meal | null)[] = []
  for (let day = 0; day < 7; day++) {
    const locked = lockedAt(day, 'dinner')
    const lockedMeal = locked?.mealId ? (byId.get(locked.mealId) ?? null) : null
    const meal = locked
      ? lockedMeal
      : pickDinner(dinnerPool, usedDinners, usedByDay[day], tally, recent, rng)
    if (!locked && !meal) thin.add('dinners')
    if (meal) {
      usedDinners.add(meal.id)
      usedByDay[day].add(meal.id)
      countMeal(tally, meal)
    }
    dinners.push(meal)
  }

  const slots: Slot[] = []
  for (let day = 0; day < 7; day++) {
    for (const mealType of MEAL_TYPES) {
      const locked = lockedAt(day, mealType)
      if (locked) {
        slots.push({ ...locked, outcome: 'pending', skipReason: null, portionFeedback: null })
        if (locked.mealId) usedByDay[day].add(locked.mealId)
        continue
      }
      if (mealType === 'dinner') {
        slots.push(slotFor(day, mealType, dinners[day]))
        continue
      }
      const meal = pickFromRotation(rotations[mealType], day, usedByDay[day])
      if (meal) usedByDay[day].add(meal.id)
      slots.push(slotFor(day, mealType, meal))
    }
  }

  return { slots, thin: [...thin] }
}

/**
 * The rotation cycles with the day, stepping past anything already eaten today
 * (a meal can be both a breakfast and a lunch).
 */
function pickFromRotation(rotation: Meal[], day: number, usedToday: Set<string>): Meal | null {
  if (!rotation.length) return null
  for (let step = 0; step < rotation.length; step++) {
    const meal = rotation[(day + step) % rotation.length]
    if (!usedToday.has(meal.id)) return meal
  }
  return rotation[day % rotation.length]
}

/**
 * Dinners never repeat within a week, and never repeat what's already being
 * eaten earlier the same day. When the library runs out the same-day rule is
 * relaxed first, then the no-repeats rule — a duplicate beats an empty slot.
 */
function pickDinner(
  pool: Meal[],
  used: Set<string>,
  usedToday: Set<string>,
  tally: Tally,
  recent: Set<string>,
  rng: Rng,
): Meal | null {
  let best: Meal | null = null
  let bestScore = -Infinity
  for (const meal of pool) {
    if (used.has(meal.id) || usedToday.has(meal.id)) continue
    const score = scoreDinner(meal, tally, recent, rng() * 0.6)
    if (score > bestScore) {
      bestScore = score
      best = meal
    }
  }
  if (best) return best
  const notUsedThisWeek = pool.filter((m) => !used.has(m.id))
  const candidates = notUsedThisWeek.length ? notUsedThisWeek : pool
  return candidates.length ? candidates[Math.floor(rng() * candidates.length)] : null
}

/**
 * Re-roll a single slot with the rest of the week held fixed. Dinners avoid every
 * other dinner in the week; breakfast/lunch just avoid what's already there.
 */
export function rerollSlot(
  slots: Slot[],
  index: number,
  library: Meal[],
  season: Season,
  rng: Rng,
): Meal | null {
  const slot = slots[index]
  const pool = eligible(library, slot.mealType, season)
  const used = new Set<string>()
  // Whatever else is on the plate that day is off the table.
  for (const s of slots) if (s.day === slot.day && s.mealId) used.add(s.mealId)
  if (slot.mealType === 'dinner') {
    for (const s of slots) if (s.mealType === 'dinner' && s.mealId) used.add(s.mealId)
  }
  const options = pool.filter((m) => !used.has(m.id))
  if (!options.length) return null
  return options[Math.floor(rng() * options.length)]
}
