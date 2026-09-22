/**
 * Calendar arithmetic and display formatting for the week-based UI.
 *
 * Weeks start on Monday (day 0) everywhere in the app, and a week is keyed by
 * the ISO date of its Monday. Dates are handled in local time, never UTC: a
 * plan is for the household's Monday, not the server's.
 */

/** Monday-first day names, indexed by `Slot.day`. */
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The Monday of the week containing `date`, at local midnight. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  // getDay() is Sunday-first; we want Monday as day 0.
  const shift = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - shift)
  return d
}

/** `date` plus `days`, at local midnight. Negative values go backwards. */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + days)
  return d
}

/** `date` plus `weeks`, at local midnight. */
export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7)
}

/** Local-date ISO string ("2026-09-21") — the key format for `store.plans`. */
export function toISODate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

/** Inverse of `toISODate`. Parses as a local date, not UTC. */
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

/** "17 – 23 Aug", collapsing the month when both ends share one. Used on week cards and list headers. */
export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  if (weekStart.getMonth() === end.getMonth()) {
    return `${weekStart.getDate()} – ${end.getDate()} ${MONTH_SHORT[end.getMonth()]}`
  }
  return `${formatDay(weekStart)} – ${formatDay(end)}`
}

/** Index of today within the week starting `weekStart`, Monday = 0. Null when that isn't the current week. */
export function todayIndex(weekStart: Date, today = new Date()): number | null {
  const start = startOfWeek(today)
  if (toISODate(start) !== toISODate(weekStart)) return null
  return (today.getDay() + 6) % 7
}
