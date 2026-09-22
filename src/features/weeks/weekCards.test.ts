import { describe, expect, it } from 'vitest'
import type { Slot, WeekPlan } from '../../types'
import { buildWeekCards } from './weekCards'
import type { WeekView } from './weekView'

const monday = new Date(2026, 8, 21) // Mon 21 Sep 2026

function slot(outcome: Slot['outcome']): Slot {
  return {
    day: 0,
    mealType: 'dinner',
    mealId: 'm1',
    mealName: 'Chilli',
    locked: false,
    outcome,
    skipReason: null,
    portionFeedback: null,
  }
}

function plan(status: WeekPlan['status'], slots: Slot[]): WeekPlan {
  return { id: 'p', weekStart: '2026-09-21', slots, status, seed: 1 }
}

function view(offset: number, p?: WeekPlan): WeekView {
  return { offset, start: monday, iso: '2026-09-21', plan: p }
}

describe('buildWeekCards', () => {
  it('labels an unplanned week by whether it is behind or ahead', () => {
    const [past, future] = buildWeekCards([view(-1), view(1)])
    expect(past.chip).toBe('No plan')
    expect(past.meta).toBe('Nothing recorded')
    expect(future.chip).toBe('Not planned')
    expect(future.meta).toBe('Tap to plan')
  })

  it('summarises a past week by outcome counts', () => {
    const [card] = buildWeekCards([
      view(-1, plan('accepted', [slot('eaten'), slot('eaten'), slot('skipped'), slot('pending')])),
    ])
    expect(card.kicker).toBe('Last week')
    expect(card.chip).toBe('Done')
    expect(card.meta).toBe('2 eaten · 1 skipped')
  })

  it('flags a draft for review', () => {
    const [card] = buildWeekCards([view(1, plan('draft', [slot('pending')]))])
    expect(card.chip).toBe('Draft')
    expect(card.meta).toBe('Review before shopping')
  })

  it('shows tick progress for this week and "list ready" for next', () => {
    const accepted = plan('accepted', [slot('eaten'), slot('pending'), slot('pending')])
    const [thisWeek, nextWeek] = buildWeekCards([view(0, accepted), view(1, accepted)])
    expect(thisWeek.chip).toBe('Shopped')
    expect(thisWeek.meta).toBe('1 of 3 ticked')
    expect(nextWeek.chip).toBe('Locked in')
    expect(nextWeek.meta).toBe('List ready')
  })
})
