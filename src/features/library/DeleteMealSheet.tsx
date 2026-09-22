import { BottomSheet, SheetRow } from '../../components/BottomSheet'
import type { Meal } from '../../types'

interface DeleteMealSheetProps {
  meal: Meal
  onConfirm: (meal: Meal) => void
  onCancel: () => void
}

/** Hard-delete confirmation. Only reachable for meals no plan has ever used. */
export function DeleteMealSheet({ meal, onConfirm, onCancel }: DeleteMealSheetProps) {
  return (
    // Above the editor's z-[12], since deleting can be started from inside it.
    <div className="absolute inset-0 z-[14]">
      <BottomSheet
        kicker="Meals"
        title={`Delete ${meal.name}?`}
        note="No week has ever used it, so nothing’s lost — but this one doesn’t come back."
        onClose={onCancel}
      >
        <div className="mt-4 flex flex-col gap-[7px]">
          <SheetRow onClick={() => onConfirm(meal)} className="flex items-center gap-3 text-accent-700">
            <span className="text-[15px]">🗑️</span> Yes, delete it
          </SheetRow>
          <SheetRow onClick={onCancel} className="flex items-center gap-3">
            <span className="text-[15px]">↩️</span> Keep it after all
          </SheetRow>
        </div>
      </BottomSheet>
    </div>
  )
}
