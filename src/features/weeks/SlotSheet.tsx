import { useMemo, useState } from 'react'
import { BottomSheet, SheetRow } from '../../components/BottomSheet'
import { DAY_NAMES } from '../../lib/dates'
import { SKIP_REASONS, type Meal, type WeekPlan } from '../../types'
import { candidatesFor } from './slotCandidates'
import type { SlotActions } from './useSlotActions'
import type { SlotScope } from './weekView'

export type SheetMode = 'actions' | 'pick' | 'skip' | 'skip-note'

/** Which slot the sheet is about, and which step of the sheet is showing. */
export interface SheetTarget {
  weekStart: string
  index: number
  scope: SlotScope
  mode: SheetMode
}

interface SlotSheetProps {
  target: SheetTarget
  plan: WeekPlan
  meals: Meal[]
  actions: SlotActions
  onChangeMode: (mode: SheetMode) => void
  onClose: () => void
}

/**
 * The bottom sheet for a tapped slot. A live slot asks how it went; a draft
 * slot offers re-roll, pick, lock. Every action closes the sheet itself.
 */
export function SlotSheet({ target, plan, meals, actions, onChangeMode, onClose }: SlotSheetProps) {
  const { weekStart, index, scope, mode } = target
  const slot = plan.slots[index]
  const [skipNote, setSkipNote] = useState('')

  const candidates = useMemo(
    () => (mode === 'pick' ? candidatesFor(plan, index, meals) : []),
    [mode, plan, index, meals],
  )

  if (!slot) return null

  const skip = (note?: string) => {
    onClose()
    actions.markSkipped(weekStart, index, 'other', note)
  }

  const title =
    mode === 'pick'
      ? `Pick a ${slot.mealType}`
      : mode === 'skip'
        ? 'What happened?'
        : mode === 'skip-note'
          ? 'Anything to note?'
          : slot.mealName

  return (
    <BottomSheet
      kicker={`${scope === 'live' ? 'This week' : 'Planned'} · ${DAY_NAMES[slot.day]} ${slot.mealType}`}
      title={title}
      note={
        mode === 'actions' && scope === 'live'
          ? 'The shopping’s already done for this week, so the plan stays put — just tell me how it went.'
          : null
      }
      onClose={onClose}
    >
      {mode === 'actions' && (
        <div className="mt-4 flex flex-col gap-[7px]">
          {scope === 'live' ? (
            <>
              <SheetRow
                onClick={() => {
                  onClose()
                  actions.markEaten(weekStart, index)
                }}
                className="flex items-center gap-3"
              >
                <span className="text-[15px]">✅</span> We ate it
              </SheetRow>
              <SheetRow onClick={() => onChangeMode('skip')} className="flex items-center gap-3">
                <span className="text-[15px]">🙈</span> We didn’t eat it
              </SheetRow>
            </>
          ) : (
            <>
              <SheetRow
                onClick={() => {
                  onClose()
                  actions.reroll(weekStart, index)
                }}
                className="flex items-center gap-3"
              >
                <span className="text-[15px]">🎲</span> Roll something else
              </SheetRow>
              <SheetRow onClick={() => onChangeMode('pick')} className="flex items-center gap-3">
                <span className="text-[15px]">📖</span> Pick from the library
              </SheetRow>
              <SheetRow
                onClick={() => {
                  onClose()
                  actions.setLocked(weekStart, index, !slot.locked)
                }}
                className="flex items-center gap-3"
              >
                <span className="text-[15px]">{slot.locked ? '🔓' : '🔒'}</span>
                {slot.locked ? 'Unlock this slot' : 'Lock this slot'}
              </SheetRow>
            </>
          )}
        </div>
      )}

      {mode === 'pick' && (
        <div className="mt-[14px] flex flex-col gap-[6px]">
          {candidates.map((meal) => (
            <SheetRow
              key={meal.id}
              onClick={() => {
                onClose()
                actions.pickMeal(weekStart, index, meal)
              }}
              className="flex items-center justify-between gap-[10px] rounded-[14px]"
            >
              <span className="text-[14.5px] font-semibold">{meal.name}</span>
              <span className="text-[11px] font-semibold text-neutral-500">
                {meal.protein === 'none' ? meal.carbBase : meal.protein}
              </span>
            </SheetRow>
          ))}
          {candidates.length === 0 && (
            <div className="py-4 text-[13.5px] text-neutral-600">
              Nothing else in the library fits this slot yet.
            </div>
          )}
        </div>
      )}

      {mode === 'skip' && (
        <div className="mt-[14px] flex flex-col gap-[6px]">
          {SKIP_REASONS.map((reason) => (
            <SheetRow
              key={reason.value}
              onClick={() => {
                // Only "other" earns a second tap — the named reasons must stay one.
                if (reason.value === 'other') {
                  setSkipNote('')
                  onChangeMode('skip-note')
                  return
                }
                onClose()
                actions.markSkipped(weekStart, index, reason.value)
              }}
              className="rounded-[14px]"
            >
              {reason.label}
            </SheetRow>
          ))}
        </div>
      )}

      {mode === 'skip-note' && (
        <div className="mt-[14px] flex flex-col gap-[6px]">
          <input
            type="text"
            value={skipNote}
            onChange={(e) => setSkipNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') skip(skipNote)
            }}
            placeholder="Freezer raid, out late…"
            maxLength={80}
            autoFocus
            className="input"
          />
          <SheetRow onClick={() => skip(skipNote)} className="rounded-[14px]">
            Save
          </SheetRow>
          <SheetRow onClick={() => skip()} className="rounded-[14px] text-neutral-600">
            Skip without a note
          </SheetRow>
        </div>
      )}
    </BottomSheet>
  )
}
