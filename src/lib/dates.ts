import type { Season } from '../types'

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Northern hemisphere, hard-coded. One function so a hemisphere flag has one home. */
export function seasonForMonth(month: number): Season {
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}

export function currentSeason(today = new Date()): Season {
  return seasonForMonth(today.getMonth())
}

/**
 * The season of the week a plan covers, not today's — drafting in late February
 * for a March week must pick spring meals. A week straddling a month boundary
 * takes the month it starts in.
 */
export function seasonForWeek(weekStart: Date): Season {
  return seasonForMonth(weekStart.getMonth())
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  // getDay() is Sunday-first; we want Monday as day 0.
  const shift = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - shift)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + days)
  return d
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7)
}

export function toISODate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "17 Aug" */
export function formatDay(date: Date): string {
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`
}

/** "Mon 17 Aug" */
export function formatDayWithName(date: Date): string {
  return `${DAY_SHORT[date.getDay() === 0 ? 6 : date.getDay() - 1]} ${formatDay(date)}`
}

/** "17 – 23 Aug", collapsing the month when both ends share one. */
export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  if (weekStart.getMonth() === end.getMonth()) {
    return `${weekStart.getDate()} – ${end.getDate()} ${MONTH_SHORT[end.getMonth()]}`
  }
  return `${formatDay(weekStart)} – ${formatDay(end)}`
}

/** Index of today within its week, Monday = 0. Null when the week isn't the current one. */
export function todayIndex(weekStart: Date, today = new Date()): number | null {
  const start = startOfWeek(today)
  if (toISODate(start) !== toISODate(weekStart)) return null
  return (today.getDay() + 6) % 7
}
