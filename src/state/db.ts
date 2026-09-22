/**
 * The Firestore-shaped half of the store: where documents live, how a snapshot
 * becomes a domain object, and how a signed-in user finds their household.
 * Plain functions, no React — `store.tsx` wires them to subscriptions and actions.
 *
 * Layout (spec §3):
 *   /households/{hid}              name, memberUids[], settings
 *     /meals/{mealId}              doc id = meal.id
 *     /weekPlans/{weekStart}       doc id = the ISO Monday, so one plan per week is
 *                                  structural and two devices drafting offline converge
 *     /ingredients/{ingredientId}  Stage 4
 */

import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { DEFAULT_SETTINGS, type Household, type Meal, type Settings, type WeekPlan } from '../types'
import { db } from './firebase'

export const householdsCol = () => collection(db, 'households')
export const householdRef = (hid: string) => doc(db, 'households', hid)
export const mealsCol = (hid: string) => collection(householdRef(hid), 'meals')
export const mealRef = (hid: string, mealId: string) => doc(mealsCol(hid), mealId)
export const weekPlansCol = (hid: string) => collection(householdRef(hid), 'weekPlans')
export const weekPlanRef = (hid: string, weekStart: string) => doc(weekPlansCol(hid), weekStart)

/*
 * Mappers fill defaults for fields a document may lack — written by an older build,
 * or by a hand edit in the Emulator UI — so a missing field degrades to "empty"
 * rather than a crash somewhere in a screen. They take plain data, not snapshots,
 * so they are testable without Firebase.
 */

export function toSettings(data: DocumentData | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...(data ?? {}) }
}

export function toHousehold(id: string, data: DocumentData): Household {
  return {
    id,
    name: data.name ?? 'Our larder',
    memberUids: data.memberUids ?? [],
    settings: toSettings(data.settings),
  }
}

export function toMeal(id: string, data: DocumentData): Meal {
  return {
    id,
    name: data.name ?? '',
    mealTypes: data.mealTypes ?? [],
    protein: data.protein ?? 'other',
    carbBase: data.carbBase ?? 'none',
    seasons: data.seasons ?? [],
    ingredients: data.ingredients ?? [],
    effort: data.effort,
    archived: data.archived ?? false,
  }
}

export function toPlan(id: string, data: DocumentData): WeekPlan {
  return {
    id: data.id ?? id,
    weekStart: data.weekStart ?? id,
    slots: data.slots ?? [],
    status: data.status ?? 'draft',
    seed: data.seed ?? 0,
    thin: data.thin ?? [],
    generatedBy: data.generatedBy ?? 'client',
    ticked: data.ticked ?? {},
  }
}

/**
 * The household this user belongs to, created on first sign-in if there is none.
 * The query is exactly the shape the `list` rule permits (`memberUids` contains the
 * caller), and `create` only allows a household of one — see `firestore.rules`.
 * Stage 3 adds joining someone else's on top of this.
 */
const inFlight = new Map<string, Promise<string>>()

export function findOrCreateHousehold(uid: string): Promise<string> {
  // One lookup per uid at a time: StrictMode runs the store's effect twice in dev,
  // and two concurrent empty queries would otherwise each create a household.
  const pending = inFlight.get(uid)
  if (pending) return pending
  const lookup = (async () => {
    const found = await getDocs(query(householdsCol(), where('memberUids', 'array-contains', uid), limit(1)))
    if (!found.empty) return found.docs[0].id
    const created = await addDoc(householdsCol(), {
      name: 'Our larder',
      memberUids: [uid],
      settings: DEFAULT_SETTINGS,
      createdAt: serverTimestamp(),
    })
    return created.id
  })().finally(() => inFlight.delete(uid))
  inFlight.set(uid, lookup)
  return lookup
}
