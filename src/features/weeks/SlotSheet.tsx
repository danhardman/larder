import { useMemo, useState } from 'react'
import { BottomSheet, SheetRow } from '../../components/BottomSheet'
import { DAY_NAMES } from '../../lib/dates'
import { blankSlots } from '../../lib/generatePlan'
import { AWAY_REASONS, AWAY_SHORT, SKIP_REASONS, type Meal, type Slot, type WeekPlan } from '../../types'
import { candidatesFor } from './slotCandidates'
import type { SlotActions } from './useSlotActions'
import { type SlotScope } from './weekView'

export type SheetMode = 'actions' | 'pick' | 'skip' | 'skip-note' | 'away' | 'away-note'

function sheetTitle(mode: SheetMode, slot: Slot): string {
  switch (mode) {
    case 'pick':
      return `Pick a ${slot.mealType}`
    case 'skip':
      return 'What happened?'
    case 'away':
      return 'What’s on instead?'
    case 'skip-note':
    case 'away-note':
      return 'Anything to note?'
    default:
      return slot.away ? AWAY_SHORT[slot.away] : slot.mealName || 'Nothing here yet'
  }
}

function sheetNote(mode: SheetMode, scope: SlotScope, slot: Slot): string | null {
  if (mode !== 'actions') return null
  if (slot.away) return 'Nothing gets cooked or bought for this one.'
  if (scope === 'live') {
    return 'The shopping’s already done for this week, so the plan stays put — just tell me how it went.'
  }
  return null
}

export interface SheetTarget {
  weekStart: string
  index: number
  scope: SlotScope
  mode: SheetMode
}

interface SlotSheetProps {
  target: SheetTarget
  plan?: WeekPlan
  meals: Meal[]
  actions: SlotActions
  onChangeMode: (mode: SheetMode) => void
  onClose: () => void
}

/**
 * The bottom sheet for a tapped slot. A live slot asks how it went; a draft slot
 * offers re-roll, pick, lock, and "we're out that night". Every action closes the
 * sheet itself.
 */
export function SlotSheet({ target, plan, meals, actions, onChangeMode, onClose }: SlotSheetProps) {
  const { weekStart, index, scope, mode } = target
  const [note, setNote] = useState('')

  const blank = useMemo(() => blankSlots(), [])
  const slot = plan?.slots[index] ?? blank[index]
  const drafted = !!plan && plan.status !== 'pencilled'

  const candidates = useMemo(
    () => (mode === 'pick' && plan ? candidatesFor(plan, index, meals) : []),
    [mode, plan, index, meals],
  )

  if (!slot) return null

  const away = slot.away ?? null
  const noteMode = mode === 'skip-note' || mode === 'away-note'

  const saveNote = (text?: string) => {
    onClose()
    if (mode === 'away-note') actions.markAway(weekStart, index, 'other', text)
    else actions.markSkipped(weekStart, index, 'other', text)
  }

  return (
    <BottomSheet
      kicker={`${scope === 'live' ? 'This week' : 'Planned'} · ${DAY_NAMES[slot.day]} ${slot.mealType}`}
      title={sheetTitle(mode, slot)}
      note={sheetNote(mode, scope, slot)}
      onClose={onClose}
    >
      {mode === 'actions' && away && (
        <div className="mt-4 flex flex-col gap-[7px]">
          <SheetRow onClick={() => onChangeMode('away')} className="flex items-center gap-3">
            <span className="text-[15px]">✏️</span> Change the reason
          </SheetRow>
          <SheetRow
            onClick={() => {
              onClose()
              actions.clearAway(weekStart, index)
            }}
            className="flex items-center gap-3"
          >
            <span className="text-[15px]">🍽️</span>
            {scope === 'live' ? 'Actually, we’re eating in' : 'Put a meal back'}
          </SheetRow>
        </div>
      )}

      {mode === 'actions' && !away && (
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
              {drafted && (
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
              <SheetRow onClick={() => onChangeMode('away')} className="flex items-center gap-3">
                <span className="text-[15px]">🚪</span> We’re out that {slot.mealType}
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

      {(mode === 'skip' || mode === 'away') && (
        <div className="mt-[14px] flex flex-col gap-[6px]">
          {(mode === 'away' ? AWAY_REASONS : SKIP_REASONS).map((reason) => (
            <SheetRow
              key={reason.value}
              onClick={() => {
                // Only "other" earns a second tap — the named reasons must stay one.
                if (reason.value === 'other') {
                  setNote('')
                  onChangeMode(mode === 'away' ? 'away-note' : 'skip-note')
                  return
                }
                onClose()
                if (mode === 'away') actions.markAway(weekStart, index, reason.value)
                else actions.markSkipped(weekStart, index, reason.value)
              }}
              className="rounded-[14px]"
            >
              {reason.label}
            </SheetRow>
          ))}
        </div>
      )}

      {noteMode && (
        <div className="mt-[14px] flex flex-col gap-[6px]">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveNote(note)
            }}
            placeholder={mode === 'away-note' ? 'Birthday lunch, work do…' : 'Freezer raid, out late…'}
            maxLength={80}
            autoFocus
            className="input"
          />
          <SheetRow onClick={() => saveNote(note)} className="rounded-[14px]">
            Save
          </SheetRow>
          <SheetRow onClick={() => saveNote()} className="rounded-[14px] text-neutral-600">
            {mode === 'away-note' ? 'Save without a note' : 'Skip without a note'}
          </SheetRow>
        </div>
      )}
    </BottomSheet>
  )
}
