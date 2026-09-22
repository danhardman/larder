import { useMemo, useState } from 'react'
import { addWeeks, startOfWeek, toISODate } from '../../lib/dates'
import { seasonForWeek } from '../../lib/seasons'
import { useLarder } from '../../state/store'
import { buildWeekCards } from './weekCards'
import type { WeekView } from './weekView'

/** Index into `weeks` for this week; the strip opens here. */
const THIS_WEEK = 1

/** The three weeks on show (last / this / next), which one is selected, and the strip cards. */
export function useWeeks() {
  const { plans } = useLarder()
  const [weekIndex, setWeekIndex] = useState(THIS_WEEK)

  const weeks: WeekView[] = useMemo(() => {
    const thisMonday = startOfWeek(new Date())
    return [-1, 0, 1].map((offset) => {
      const start = addWeeks(thisMonday, offset)
      const iso = toISODate(start)
      return { offset, start, iso, plan: plans[iso] }
    })
  }, [plans])

  const week = weeks[weekIndex]
  // Every season decision is about a specific week, never about today.
  const season = seasonForWeek(week.start)
  const cards = useMemo(() => buildWeekCards(weeks), [weeks])

  return { weeks, week, weekIndex, selectWeek: setWeekIndex, season, cards }
}
