import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { currentSeason } from '../lib/dates'
import { generatePlan } from '../lib/generatePlan'
import { randomSeed } from '../lib/rng'
import { mealsInUse, statsByMeal, type MealStats } from '../lib/stats'
import { loadData, newId, saveData, type LarderData } from '../lib/storage'
import type { Meal, Settings, Slot, WeekPlan } from '../types'

interface LarderStore extends LarderData {
  plansList: WeekPlan[]
  stats: Map<string, MealStats>
  /** Meals a plan still points at — archivable, but not safe to delete outright. */
  usedMealIds: Set<string>
  planFor: (weekStart: string) => WeekPlan | undefined
  /** Draft a week from scratch, keeping any locked slots already in place. */
  draftWeek: (weekStart: string) => { thin: string[] }
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

export function LarderProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LarderData>(() => loadData())

  useEffect(() => {
    saveData(data)
  }, [data])

  const plansList = useMemo(() => Object.values(data.plans), [data.plans])
  const stats = useMemo(() => statsByMeal(plansList), [plansList])
  const usedMealIds = useMemo(() => mealsInUse(plansList), [plansList])

  const planFor = useCallback((weekStart: string) => data.plans[weekStart], [data.plans])

  const draftWeek = useCallback(
    (weekStart: string) => {
      const seed = randomSeed()
      const existing = data.plans[weekStart]
      // Generated here rather than inside the updater so the caller can act on
      // `thin` straight away — an updater doesn't run until the next render.
      const result = generatePlan({
        library: data.meals,
        history: Object.values(data.plans).filter((p) => p.weekStart < weekStart),
        season: currentSeason(),
        seed,
        rotationSize: data.settings.rotationSize,
        recencyWindowWeeks: data.settings.recencyWindowWeeks,
        keep: existing?.slots,
      })
      const plan: WeekPlan = {
        id: existing?.id ?? newId(),
        weekStart,
        slots: result.slots,
        status: 'draft',
        seed,
      }
      setData((prev) => ({ ...prev, plans: { ...prev.plans, [weekStart]: plan } }))
      return { thin: result.thin }
    },
    [data],
  )

  const setPlan = useCallback((weekStart: string, change: (plan: WeekPlan) => WeekPlan) => {
    setData((prev) => {
      const plan = prev.plans[weekStart]
      if (!plan) return prev
      return { ...prev, plans: { ...prev.plans, [weekStart]: change(plan) } }
    })
  }, [])

  const acceptWeek = useCallback(
    (weekStart: string) => setPlan(weekStart, (plan) => ({ ...plan, status: 'accepted' })),
    [setPlan],
  )

  const reopenWeek = useCallback(
    (weekStart: string) => setPlan(weekStart, (plan) => ({ ...plan, status: 'draft' })),
    [setPlan],
  )

  const patchSlot = useCallback(
    (weekStart: string, index: number, changes: Partial<Slot>) =>
      setPlan(weekStart, (plan) => {
        const slots = plan.slots.slice()
        slots[index] = { ...slots[index], ...changes }
        return { ...plan, slots }
      }),
    [setPlan],
  )

  const saveMeal = useCallback((meal: Meal) => {
    setData((prev) => {
      const at = prev.meals.findIndex((m) => m.id === meal.id)
      const meals = prev.meals.slice()
      if (at >= 0) meals[at] = meal
      else meals.push(meal)
      return { ...prev, meals }
    })
  }, [])

  const setMealArchived = useCallback((mealId: string, archived: boolean) => {
    setData((prev) => ({
      ...prev,
      meals: prev.meals.map((m) => (m.id === mealId ? { ...m, archived } : m)),
    }))
  }, [])

  /**
   * Hard delete. Plans keep their denormalised `mealName`, so past weeks still
   * read correctly — callers gate this on `usedMealIds` to protect the lists
   * that do resolve by id.
   */
  const deleteMeal = useCallback((mealId: string) => {
    setData((prev) => ({ ...prev, meals: prev.meals.filter((m) => m.id !== mealId) }))
  }, [])

  const toggleTick = useCallback((weekStart: string, key: string) => {
    setData((prev) => {
      const week = { ...(prev.ticked[weekStart] ?? {}) }
      if (week[key]) delete week[key]
      else week[key] = true
      return { ...prev, ticked: { ...prev.ticked, [weekStart]: week } }
    })
  }, [])

  const updateSettings = useCallback((changes: Partial<Settings>) => {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...changes } }))
  }, [])

  const value: LarderStore = {
    ...data,
    plansList,
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
