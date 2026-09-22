import { describe, expect, it } from 'vitest'
import { fromISODate } from './dates'
import { seasonForMonth, seasonForWeek } from './seasons'

describe('seasonForMonth', () => {
  it('maps the northern-hemisphere calendar', () => {
    expect(seasonForMonth(0)).toBe('winter')
    expect(seasonForMonth(3)).toBe('spring')
    expect(seasonForMonth(6)).toBe('summer')
    expect(seasonForMonth(9)).toBe('autumn')
  })
})

describe('seasonForWeek', () => {
  it('reads the season of the week itself, not of today', () => {
    expect(seasonForWeek(fromISODate('2026-03-02'))).toBe('spring')
    expect(seasonForWeek(fromISODate('2026-07-06'))).toBe('summer')
    expect(seasonForWeek(fromISODate('2026-12-07'))).toBe('winter')
  })

  it('takes the month the week starts in when it straddles a boundary', () => {
    // Mon 23 Feb – Sun 1 Mar: February, so winter, even though it reaches spring.
    expect(seasonForWeek(fromISODate('2026-02-23'))).toBe('winter')
    // Mon 2 Mar is the first fully-March week, and the first spring one.
    expect(seasonForWeek(fromISODate('2026-03-02'))).toBe('spring')
  })
})
