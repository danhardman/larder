/**
 * `useLarder()`: every piece of household data plus the actions that change it,
 * backed by Firestore under `/households/{hid}` (spec §3). This is the seam — screens
 * never import Firestore and never learn where data comes from (spec §7.4).
 *
 * Writes are fire-and-forget on purpose. With offline persistence a write promise
 * only settles once the server acknowledges it, so awaiting one for UI feedback would
 * hang the app in a supermarket with no signal. The local snapshot fires straight
 * away (latency compensation), which is what the screens react to; a rejected write
 * surfaces through `error` instead.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { deleteDoc, deleteField, FieldPath, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { LoadingScreen } from '../components/LoadingScreen'
import { fromISODate } from '../lib/dates'
import { seasonForWeek } from '../lib/seasons'
import { generatePlan } from '../lib/generatePlan'
import { newId } from '../lib/ids'
import { randomSeed } from '../lib/rng'
import { mealsInUse, statsByMeal, type MealStats } from '../lib/stats'
import { DEFAULT_SETTINGS, type Household, type Meal, type Settings, type Slot, type WeekPlan } from '../types'
import { useAuth } from './auth'
import {
  findOrCreateHousehold,
  householdRef,
  mealRef,
  mealsCol,
  toHousehold,
  toMeal,
  toPlan,
  weekPlanRef,
  weekPlansCol,
} from './db'

export interface LarderStore {
  meals: Meal[]
  /** Keyed by weekStart ISO date. */
  plans: Record<string, WeekPlan>
  plansList: WeekPlan[]
  settings: Settings
  /** Shopping-list ticks, keyed by weekStart then `name|unit`. */
  ticked: Record<string, Record<string, boolean>>
  stats: Map<string, MealStats>
  /** Meals a plan still points at — archivable, but not safe to delete outright. */
  usedMealIds: Set<string>
  planFor: (weekStart: string) => WeekPlan | undefined
  /**
   * Draft a week from scratch, keeping any locked slots already in place. Resolves once
   * the write is issued; the result — including `thin` — is observed on the plan
   * document, never returned (spec §7.4, constraint 1).
   */
  draftWeek: (weekStart: string) => Promise<void>
  acceptWeek: (weekStart: string) => void
  reopenWeek: (weekStart: string) => void
  patchSlot: (weekStart: string, index: number, changes: Partial<Slot>) => void
  saveMeal: (meal: Meal) => void
  setMealArchived: (mealId: string, archived: boolean) => void
  deleteMeal: (mealId: string) => void
  toggleTick: (weekStart: string, key: string) => void
  updateSettings: (changes: Partial<Settings>) => void
}

const StoreContext = createContext<LarderStore | null>(null)

const describe = (err: unknown): string => {
  const e = err as { code?: string; message?: string }
  return e?.code ? `${e.code}: ${e.message ?? ''}` : String(err)
}

export function LarderProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const uid = user?.uid ?? null

  const [hid, setHid] = useState<string | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [meals, setMeals] = useState<Meal[] | null>(null)
  const [plans, setPlans] = useState<Record<string, WeekPlan> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fail = useCallback((err: unknown) => setError(describe(err)), [])

  // Resolve the household once per signed-in user.
  useEffect(() => {
    if (!uid) return
    let cancelled = false
    setHid(null)
    findOrCreateHousehold(uid)
      .then((id) => {
        if (!cancelled) setHid(id)
      })
      .catch((err) => {
        if (!cancelled) fail(err)
      })
    return () => {
      cancelled = true
    }
  }, [uid, fail])

  // Three live subscriptions. `ready` below waits for the first delivery of each,
  // so no screen ever renders a half-loaded household as if it were empty.
  useEffect(() => {
    if (!hid) return
    setHousehold(null)
    setMeals(null)
    setPlans(null)
    const stop = [
      onSnapshot(
        householdRef(hid),
        (snap) => setHousehold(snap.exists() ? toHousehold(snap.id, snap.data()) : null),
        fail,
      ),
      onSnapshot(
        mealsCol(hid),
        (snap) => setMeals(snap.docs.map((d) => toMeal(d.id, d.data()))),
        fail,
      ),
      onSnapshot(
        weekPlansCol(hid),
        (snap) => {
          const next: Record<string, WeekPlan> = {}
          for (const d of snap.docs) {
            const plan = toPlan(d.id, d.data())
            next[plan.weekStart] = plan
          }
          setPlans(next)
        },
        fail,
      ),
    ]
    return () => stop.forEach((unsubscribe) => unsubscribe())
  }, [hid, fail])

  const ready = hid !== null && household !== null && meals !== null && plans !== null

  const settings = household?.settings ?? DEFAULT_SETTINGS
  const plansList = useMemo(() => Object.values(plans ?? {}), [plans])
  const stats = useMemo(() => statsByMeal(plansList), [plansList])
  const usedMealIds = useMemo(() => mealsInUse(plansList), [plansList])
  const ticked = useMemo(
    () => Object.fromEntries(plansList.map((plan) => [plan.weekStart, plan.ticked])),
    [plansList],
  )

  const planFor = useCallback((weekStart: string) => plans?.[weekStart], [plans])

  const draftWeek = useCallback(
    async (weekStart: string) => {
      if (!hid || !meals) return
      const seed = randomSeed()
      const existing = plans?.[weekStart]
      const result = generatePlan({
        library: meals,
        history: plansList.filter((p) => p.weekStart < weekStart),
        season: seasonForWeek(fromISODate(weekStart)),
        seed,
        rotationSize: settings.rotationSize,
        recencyWindowWeeks: settings.recencyWindowWeeks,
        keep: existing?.slots,
      })
      const plan: WeekPlan = {
        id: existing?.id ?? newId(),
        weekStart,
        slots: result.slots,
        status: 'draft',
        seed,
        thin: result.thin,
        generatedBy: 'client',
        ticked: existing?.ticked ?? {},
      }
      setDoc(weekPlanRef(hid, weekStart), plan).catch(fail)
    },
    [hid, meals, plans, plansList, settings, fail],
  )

  const patchPlan = useCallback(
    (weekStart: string, changes: Partial<WeekPlan>) => {
      if (!hid || !plans?.[weekStart]) return
      updateDoc(weekPlanRef(hid, weekStart), changes).catch(fail)
    },
    [hid, plans, fail],
  )

  const acceptWeek = useCallback(
    (weekStart: string) => patchPlan(weekStart, { status: 'accepted' }),
    [patchPlan],
  )

  const reopenWeek = useCallback(
    (weekStart: string) => patchPlan(weekStart, { status: 'draft' }),
    [patchPlan],
  )

  const patchSlot = useCallback(
    (weekStart: string, index: number, changes: Partial<Slot>) => {
      const plan = plans?.[weekStart]
      if (!plan) return
      const slots = plan.slots.slice()
      slots[index] = { ...slots[index], ...changes }
      patchPlan(weekStart, { slots })
    },
    [plans, patchPlan],
  )

  const saveMeal = useCallback(
    (meal: Meal) => {
      if (!hid) return
      setDoc(mealRef(hid, meal.id), meal).catch(fail)
    },
    [hid, fail],
  )

  const setMealArchived = useCallback(
    (mealId: string, archived: boolean) => {
      if (!hid) return
      updateDoc(mealRef(hid, mealId), { archived }).catch(fail)
    },
    [hid, fail],
  )

  /**
   * Hard delete. Plans keep their denormalised `mealName`, so past weeks still
   * read correctly — callers gate this on `usedMealIds` to protect the lists
   * that do resolve by id.
   */
  const deleteMeal = useCallback(
    (mealId: string) => {
      if (!hid) return
      deleteDoc(mealRef(hid, mealId)).catch(fail)
    },
    [hid, fail],
  )

  const toggleTick = useCallback(
    (weekStart: string, key: string) => {
      const plan = plans?.[weekStart]
      if (!hid || !plan) return
      // A FieldPath rather than a dotted string: ingredient names can contain `.`.
      const on = !plan.ticked[key]
      updateDoc(weekPlanRef(hid, weekStart), new FieldPath('ticked', key), on ? true : deleteField()).catch(fail)
    },
    [hid, plans, fail],
  )

  const updateSettings = useCallback(
    (changes: Partial<Settings>) => {
      if (!hid) return
      updateDoc(householdRef(hid), { settings: { ...settings, ...changes } }).catch(fail)
    },
    [hid, settings, fail],
  )

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg px-6">
        <div className="max-w-[430px] rounded-md border border-accent-400 bg-accent-100 px-4 py-3 text-[13px] leading-[1.5] text-accent-800">
          <p className="font-bold">Couldn’t reach the larder.</p>
          <p className="mt-1 break-words">{error}</p>
          <p className="mt-2 text-neutral-700">
            A permission error here usually means the Firestore rules haven’t been deployed for this
            project yet.
          </p>
        </div>
      </div>
    )
  }

  if (!ready) return <LoadingScreen />

  const value: LarderStore = {
    meals,
    plans,
    plansList,
    settings,
    ticked,
    stats,
    usedMealIds,
    planFor,
    draftWeek,
    acceptWeek,
    reopenWeek,
    patchSlot,
    saveMeal,
    setMealArchived,
    deleteMeal,
    toggleTick,
    updateSettings,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useLarder(): LarderStore {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useLarder must be used inside <LarderProvider>')
  return store
}
