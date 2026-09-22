/**
 * The ingredient catalog, subscribed on demand. Only the meal editor needs it —
 * the shopping list reads the names copied onto meals — so it lives outside
 * `LarderProvider`: it never delays first render, and the listener is torn down
 * when the editor closes. `null` until the first snapshot lands, which with the
 * persistent cache is immediate on all but the very first open.
 */

import { useEffect, useState } from 'react'
import type { Ingredient } from '../types'
import { subscribeIngredients } from './db'
import { describeError } from './errors'
import { useMemberHouseholdId } from './household'

export function useIngredientCatalog(active: boolean): {
  ingredients: Ingredient[] | null
  error: string | null
} {
  const hid = useMemberHouseholdId()
  const [ingredients, setIngredients] = useState<Ingredient[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIngredients(null)
    setError(null)
    if (!active) return
    return subscribeIngredients(hid, setIngredients, (err) => setError(describeError(err)))
  }, [hid, active])

  return { ingredients, error }
}
