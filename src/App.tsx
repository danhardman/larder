import { useState } from 'react'
import { PlusIcon } from './components/icons'
import { TabBar, type Screen } from './components/TabBar'
import { Toast } from './components/Toast'
import { DeleteMealSheet } from './features/library/DeleteMealSheet'
import { LibraryScreen } from './features/library/LibraryScreen'
import { MealEditor } from './features/library/MealEditor'
import { useLibrary } from './features/library/useLibrary'
import { SettingsScreen } from './features/settings/SettingsScreen'
import { useInvites } from './features/settings/useInvites'
import { ShoppingScreen } from './features/shopping/ShoppingScreen'
import { useShopping } from './features/shopping/useShopping'
import { DraftActionBar } from './features/weeks/DraftActionBar'
import { SlotSheet, type SheetTarget } from './features/weeks/SlotSheet'
import { useSlotActions } from './features/weeks/useSlotActions'
import { useWeeks } from './features/weeks/useWeeks'
import { WeeksScreen } from './features/weeks/WeeksScreen'
import { useAuth } from './state/auth'
import { useLarder } from './state/store'
import { useToast } from './state/toast'

/** Index into the week strip for next week — where "plan next week" lands. */
const NEXT_WEEK = 2

/**
 * The shell: which tab is showing, which overlay is open, and the wiring
 * between features. Each feature owns its own state in a hook; App only
 * composes them and handles the hand-offs that cross feature boundaries.
 */
export default function App() {
  const store = useLarder()
  const { user, signOutOfLarder } = useAuth()
  const { message: toast } = useToast()

  const [screen, setScreen] = useState<Screen>('weeks')
  const [sheet, setSheet] = useState<SheetTarget | null>(null)

  const weeks = useWeeks()
  const slots = useSlotActions({ onAccepted: () => setScreen('shop') })
  const shopping = useShopping(weeks.weeks)
  const library = useLibrary({ onSaved: () => setScreen('library') })
  const invites = useInvites()

  const goTo = (next: Screen) => {
    setScreen(next)
    slots.dismissPortion()
  }

  const selectWeek = (index: number) => {
    weeks.selectWeek(index)
    setSheet(null)
    slots.dismissPortion()
  }

  const sheetPlan = sheet ? store.planFor(sheet.weekStart) : undefined
  const { week } = weeks
  const showActionBar =
    screen === 'weeks' && week.offset >= 0 && week.plan?.status === 'draft' && !sheet && !library.editing
  const showFab = screen === 'library' && !library.editing

  return (
    <div className="flex h-dvh justify-center overflow-hidden bg-neutral-300">
      <div className="relative flex h-dvh w-full max-w-[430px] min-h-0 flex-col overflow-hidden bg-bg shadow-[0_0_60px_rgba(46,43,37,0.18)]">
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-[104px]">
          {screen === 'weeks' && (
            <WeeksScreen
              weeks={weeks.weeks}
              cards={weeks.cards}
              selected={weeks.weekIndex}
              onSelect={selectWeek}
              seasonLabel={weeks.season}
              meals={store.meals}
              stats={store.stats}
              portionFor={slots.portionFor}
              onOpenSlot={(weekStart, index, scope) =>
                setSheet({ weekStart, index, scope, mode: 'actions' })
              }
              onTick={slots.markEaten}
              onPortion={slots.setPortion}
              onDismissPortion={slots.dismissPortion}
              onDraft={slots.draftWeek}
              onReopen={slots.reopenWeek}
              onGoShop={() => setScreen('shop')}
              onGoWeek={(index) => {
                setScreen('weeks')
                weeks.selectWeek(index)
              }}
              onEditMeal={(meal) => {
                setScreen('library')
                library.openEditor(meal)
              }}
            />
          )}

          {screen === 'library' && (
            <LibraryScreen
              meals={store.meals}
              stats={store.stats}
              query={library.query}
              onQuery={library.setQuery}
              showArchived={library.showArchived}
              onShowArchived={library.setShowArchived}
              usedMealIds={store.usedMealIds}
              onEditMeal={library.openEditor}
              onArchive={library.archiveMeal}
              onRestore={library.restoreMeal}
              onDelete={library.requestDelete}
            />
          )}

          {screen === 'settings' && (
            <SettingsScreen
              household={store.household}
              settings={store.settings}
              invites={invites.invites}
              currentUid={user?.uid ?? ''}
              accountName={user?.displayName || user?.email || 'Signed in'}
              accountEmail={user?.email ?? ''}
              onInvite={invites.inviteMember}
              onRevoke={invites.revokeInvite}
              onSignOut={signOutOfLarder}
              onChangeSettings={store.updateSettings}
            />
          )}

          {screen === 'shop' && (
            <ShoppingScreen
              lines={shopping.lines}
              weekLabel={shopping.weekLabel}
              ticked={shopping.ticked}
              copied={shopping.copied}
              emptyNote={shopping.emptyNote}
              onToggle={shopping.toggle}
              onCopy={shopping.copyList}
              onPlan={() => {
                setScreen('weeks')
                weeks.selectWeek(NEXT_WEEK)
              }}
            />
          )}
        </div>

        {showActionBar && (
          <DraftActionBar
            onRedraft={() => slots.draftWeek(week.iso)}
            onAccept={() => slots.acceptWeek(week.iso)}
          />
        )}

        <TabBar
          screen={screen}
          dots={{
            weeks: weeks.weeks.some((w) => w.offset === 1 && !w.plan),
            shop: !!shopping.lines,
          }}
          onPick={goTo}
        />

        {showFab && (
          <button
            type="button"
            onClick={() => library.openEditor(null)}
            className="btn btn-primary absolute right-[18px] bottom-[88px] z-[7] gap-2 px-5 py-[14px] text-[14.5px] font-bold shadow-lg"
          >
            <PlusIcon size={18} />
            New meal
          </button>
        )}

        {sheet && sheetPlan && (
          <SlotSheet
            target={sheet}
            plan={sheetPlan}
            meals={store.meals}
            actions={slots}
            onChangeMode={(mode) => setSheet({ ...sheet, mode })}
            onClose={() => setSheet(null)}
          />
        )}

        {library.editing && (
          <MealEditor
            meal={library.editing.meal}
            catalog={library.catalog}
            usageOf={library.usageOf}
            warning={library.editorWarning}
            used={library.editorMealInUse}
            onCancel={library.closeEditor}
            onArchive={library.archiveMeal}
            onRestore={library.restoreMeal}
            onDelete={library.requestDelete}
            onSave={library.saveMeal}
            onRenameIngredient={library.renameIngredient}
          />
        )}

        {library.confirmDelete && (
          <DeleteMealSheet
            meal={library.confirmDelete}
            onConfirm={library.deleteMeal}
            onCancel={library.cancelDelete}
          />
        )}

        {toast && <Toast message={toast} />}
      </div>
    </div>
  )
}
