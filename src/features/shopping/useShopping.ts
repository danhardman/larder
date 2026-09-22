import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDay, formatWeekRange } from '../../lib/dates'
import { buildShoppingList, formatShoppingList } from '../../lib/shoppingList'
import { useLarder } from '../../state/store'
import { useToast } from '../../state/toast'
import type { WeekView } from '../weeks/weekView'

const COPIED_MS = 2600

/**
 * The shopping list for the next accepted week — next week if it's locked in,
 * otherwise this week. Nothing until a week is accepted.
 */
export function useShopping(weeks: WeekView[]) {
  const store = useLarder()
  const { say } = useToast()
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(copiedTimer.current), [])

  const week =
    weeks.find((w) => w.offset === 1 && w.plan?.status === 'accepted') ??
    weeks.find((w) => w.offset === 0 && w.plan?.status === 'accepted') ??
    null

  const lines = useMemo(
    () => (week?.plan ? buildShoppingList(week.plan.slots, store.meals) : null),
    [week, store.meals],
  )

  const nextWeekIsDraft = weeks.some((w) => w.offset === 1 && w.plan?.status === 'draft')
  const emptyNote = nextWeekIsDraft
    ? 'Next week’s still a draft. Lock it in and the list builds itself.'
    : 'Draft next week’s meals and the list builds itself from what you plan.'

  const copyList = () => {
    if (!lines || !week) return
    const text = formatShoppingList(lines, formatDay(week.start))
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(true)
    say('Copied — go forth and shop.')
    clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS)
  }

  return {
    week,
    lines,
    weekLabel: week ? formatWeekRange(week.start) : '',
    ticked: week ? (store.ticked[week.iso] ?? {}) : {},
    copied,
    emptyNote,
    copyList,
    toggle: (key: string) => week && store.toggleTick(week.iso, key),
  }
}
