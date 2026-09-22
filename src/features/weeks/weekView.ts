/** View-model helpers shared by the week views. Nothing here is persisted. */

import type { Slot, WeekPlan } from '../../types'

/** One of the three weeks the strip shows: last, this, next. */
export interface WeekView {
  /** -1 = last week, 0 = this week, 1 = next week. */
  offset: number
  start: Date
  /** ISO date of the Monday — the key into `store.plans`. */
  iso: string
  plan?: WeekPlan
}

/** Which kind of week a slot was tapped in: `live` is this week's accepted plan, `draft` is editable. */
export type SlotScope = 'live' | 'draft'

export interface SlotRef {
  weekStart: string
  index: number
}

export type IndexedSlot = { slot: Slot; index: number }

export function slotsForDay(plan: WeekPlan, day: number): IndexedSlot[] {
  return plan.slots.map((slot, index) => ({ slot, index })).filter((s) => s.slot.day === day)
}

export const TYPE_INITIAL: Record<string, string> = { breakfast: 'B', lunch: 'L', dinner: 'D' }

export function liveTone(slot: Slot, isToday: boolean) {
  if (slot.outcome === 'eaten') {
    return { box: 'bg-sage-100 border-sage-300', kicker: 'text-sage-700', faded: false }
  }
  if (slot.outcome === 'skipped') {
    return { box: 'bg-neutral-200 border-neutral-200', kicker: 'text-neutral-500', faded: true }
  }
  return {
    box: `${isToday ? 'bg-neutral-100' : 'bg-bg'} border-neutral-200`,
    kicker: 'text-neutral-500',
    faded: false,
  }
}
