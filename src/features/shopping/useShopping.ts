import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDay, formatWeekRange } from '../../lib/dates'
import { buildShoppingList, formatShoppingList } from '../../lib/shoppingList'
import { useLarder } from '../../state/store'
import { useToast } from '../../state/toast'
import type { WeekView } from '../weeks/weekView'

const COPIED_MS = 2600

const WEEK_LABELS: Record<number, string> = { [-1]: 'Last week', 0: 'This week', 1: 'Next week' }

/**
 * The shopping list for an accepted week. Defaults to the next accepted week —
 * next week if it's locked in, otherwise this week — and lets you step back to
 * any other accepted week in the strip. Nothing until a week is accepted.
 */
export function useShopping(weeks: WeekView[]) {
  const store = useLarder()
  const { say } = useToast()
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  // An override rather than the chosen week itself: accepting a new week still
  // re-defaults, and reopening the week you were looking at can't strand the screen.
  const [pickedIso, setPickedIso] = useState<string | null>(null)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(copiedTimer.current), [])

  const accepted = weeks.filter((w) => w.plan?.status === 'accepted')

  const week =
    accepted.find((w) => w.iso === pickedIso) ??
    accepted.find((w) => w.offset === 1) ??
    accepted.find((w) => w.offset === 0) ??
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
    say('Copied — paste into Notes, Select All, tap the checklist button.')
    clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS)
  }

  return {
    week,
    lines,
    weekLabel: week ? formatWeekRange(week.start) : '',
    weekOptions: accepted.map((w) => ({ value: w.iso, label: WEEK_LABELS[w.offset] ?? '' })),
    selectedIso: week?.iso ?? '',
    selectWeek: setPickedIso,
    ticked: week ? (store.ticked[week.iso] ?? {}) : {},
    copied,
    expanded,
    toggleExpanded: () => setExpanded((on) => !on),
    emptyNote,
    copyList,
    toggle: (key: string) => week && store.toggleTick(week.iso, key),
  }
}
