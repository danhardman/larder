import type { Meal, Settings, WeekPlan } from '../types'
import { SEED_MEALS } from './seedLibrary'

export interface LarderData {
  meals: Meal[]
  /** Keyed by weekStart ISO date. */
  plans: Record<string, WeekPlan>
  settings: Settings
  /** Shopping-list ticks, keyed by weekStart then `name|unit`. */
  ticked: Record<string, Record<string, boolean>>
}

const KEY = 'larder.v1'

export const DEFAULT_SETTINGS: Settings = { recencyWindowWeeks: 2, rotationSize: 2 }

export function emptyData(): LarderData {
  return { meals: SEED_MEALS, plans: {}, settings: DEFAULT_SETTINGS, ticked: {} }
}

export function loadData(): LarderData {
  if (typeof localStorage === 'undefined') return emptyData()
  const raw = localStorage.getItem(KEY)
  if (!raw) return emptyData()
  try {
    const parsed = JSON.parse(raw) as Partial<LarderData>
    return {
      meals: parsed.meals ?? SEED_MEALS,
      plans: parsed.plans ?? {},
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      ticked: parsed.ticked ?? {},
    }
  } catch {
    // A corrupt cache shouldn't brick the app — start fresh rather than crash.
    return emptyData()
  }
}

export function saveData(data: LarderData): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // Private-mode quota errors are not worth interrupting the user for.
  }
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`
}
