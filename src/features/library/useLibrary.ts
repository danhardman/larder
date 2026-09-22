import { useMemo, useState } from 'react'
import { portionWarning } from '../../lib/stats'
import { newId } from '../../lib/ids'
import { useLarder } from '../../state/store'
import { useToast } from '../../state/toast'
import type { Meal } from '../../types'
import { ingredientCatalog } from './ingredientCatalog'

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

  const catalog = useMemo(() => ingredientCatalog(store.meals), [store.meals])

  const openEditor = (meal: Meal | null) => setEditing({ meal })
  const closeEditor = () => setEditing(null)

  const editorWarning = editing?.meal ? portionWarning(store.stats.get(editing.meal.id)) : null
  const editorMealInUse = !!editing?.meal && store.usedMealIds.has(editing.meal.id)

  const saveMeal = (meal: Meal) => {
    const isNew = !editing?.meal
    store.saveMeal({ ...meal, id: meal.id || newId() })
    setEditing(null)
    onSaved()
    say(isNew ? `${meal.name} is in the larder.` : `${meal.name} updated.`)
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
    confirmDelete,
    requestDelete: setConfirmDelete,
    cancelDelete: () => setConfirmDelete(null),
    saveMeal,
    archiveMeal,
    restoreMeal,
    deleteMeal,
  }
}
