import { useMemo, useState } from 'react'
import { portionWarning } from '../../lib/stats'
import { newId } from '../../lib/ids'
import { useIngredientCatalog } from '../../state/ingredients'
import { useLarder } from '../../state/store'
import { useToast } from '../../state/toast'
import type { Ingredient, Meal } from '../../types'
import { rankIngredients, usageCount } from './ingredientCatalog'

/**
 * Library screen state (search, archived filter) plus the meal editor and the
 * delete confirmation, which can be opened from the list or from the editor.
 */
export function useLibrary({ onSaved }: { onSaved: () => void }) {
  const store = useLarder()
  const { say } = useToast()

  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  /** `{ meal: null }` is a new meal; `null` means the editor is closed. */
  const [editing, setEditing] = useState<{ meal: Meal | null } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Meal | null>(null)

  // The catalog is only fetched while the editor is open (spec §3: it exists to
  // power autocomplete and uniqueness, nothing else).
  const { ingredients, error: catalogError } = useIngredientCatalog(editing !== null)
  const catalog = useMemo(
    () => (ingredients ? rankIngredients(ingredients, store.meals) : null),
    [ingredients, store.meals],
  )

  const openEditor = (meal: Meal | null) => setEditing({ meal })
  const closeEditor = () => setEditing(null)

  const editorWarning =
    catalogError ??
    (editing?.meal ? portionWarning(store.stats.get(editing.meal.id)) : null)
  const editorMealInUse = !!editing?.meal && store.usedMealIds.has(editing.meal.id)

  const saveMeal = (meal: Meal, created: Ingredient[] = []) => {
    const isNew = !editing?.meal
    store.saveMeal({ ...meal, id: meal.id || newId() }, created)
    setEditing(null)
    onSaved()
    say(isNew ? `${meal.name} is in the larder.` : `${meal.name} updated.`)
  }

  const usageOf = (ingredientId: string) => usageCount(ingredientId, store.meals)

  /** Rename a catalog entry in every meal. Two entries can't share a name, so a
   *  clash is refused — "use a different ingredient" on the row is the way to merge. */
  const renameIngredient = (ingredientId: string, name: string) => {
    const trimmed = name.trim()
    const clash = ingredients?.find((i) => i.nameLower === trimmed.toLowerCase() && i.id !== ingredientId)
    if (clash) {
      say(`${clash.name} is already in the larder — pick “use a different ingredient” to switch to it.`)
      return
    }
    store.renameIngredient(ingredientId, trimmed)
    const n = usageOf(ingredientId)
    say(`Renamed to ${trimmed} in ${n} ${n === 1 ? 'meal' : 'meals'}.`)
  }

  const archiveMeal = (meal: Meal) => {
    store.setMealArchived(meal.id, true)
    setEditing(null)
    say(`${meal.name} archived — past weeks still count it.`)
  }

  const restoreMeal = (meal: Meal) => {
    store.setMealArchived(meal.id, false)
    setEditing(null)
    say(`${meal.name} is back in the rotation.`)
  }

  const deleteMeal = (meal: Meal) => {
    store.deleteMeal(meal.id)
    setConfirmDelete(null)
    setEditing(null)
    say(`${meal.name} is gone.`)
  }

  return {
    query,
    setQuery,
    showArchived,
    setShowArchived,
    editing,
    openEditor,
    closeEditor,
    editorWarning,
    editorMealInUse,
    catalog,
    usageOf,
    renameIngredient,
    confirmDelete,
    requestDelete: setConfirmDelete,
    cancelDelete: () => setConfirmDelete(null),
    saveMeal,
    archiveMeal,
    restoreMeal,
    deleteMeal,
  }
}
