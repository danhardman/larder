import { useEffect, useMemo, useRef, useState } from 'react'
import { BottomSheet, SheetRow } from './components/BottomSheet'
import { MealEditor } from './components/MealEditor'
import { TabBar, type Screen } from './components/TabBar'
import { Toast } from './components/Toast'
import { ArrowRightIcon, PlusIcon, ShuffleIcon } from './components/icons'
import {
  addWeeks,
  currentSeason,
  DAY_NAMES,
  formatDay,
  formatWeekRange,
  startOfWeek,
  toISODate,
} from './lib/dates'
import { eligible, rerollSlot } from './lib/generatePlan'
import { rngFrom } from './lib/rng'
import { buildShoppingList, formatShoppingList } from './lib/shoppingList'
import { portionWarning } from './lib/stats'
import { newId } from './lib/storage'
import { LibraryScreen } from './screens/LibraryScreen'
import { ShoppingScreen } from './screens/ShoppingScreen'
import { WeeksScreen, type WeekView } from './screens/WeeksScreen'
import { useLarder } from './state/store'
import { SKIP_REASONS, type Meal, type PortionFeedback, type SkipReason } from './types'
import type { WeekCard } from './components/WeekStrip'

type SheetTarget = {
  weekStart: string
  index: number
  scope: 'live' | 'draft'
  mode: 'actions' | 'pick' | 'skip'
}

const CHIP = {
  accent: 'bg-accent-200 text-accent-800',
  sage: 'bg-sage-200 text-sage-800',
  neutral: 'bg-neutral-300 text-neutral-800',
}

export default function App() {
  const store = useLarder()
  const season = currentSeason()

  const [screen, setScreen] = useState<Screen>('weeks')
  const [weekIndex, setWeekIndex] = useState(1)
  const [sheet, setSheet] = useState<SheetTarget | null>(null)
  const [portionFor, setPortionFor] = useState<{ weekStart: string; index: number } | null>(null)
  const [editor, setEditor] = useState<{ meal: Meal | null } | null>(null)
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [thinHint, setThinHint] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const say = (message: string) => {
    clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }

  const weeks: WeekView[] = useMemo(() => {
    const thisMonday = startOfWeek(new Date())
    return [-1, 0, 1].map((offset) => {
      const start = addWeeks(thisMonday, offset)
      const iso = toISODate(start)
      return { offset, start, iso, plan: store.plans[iso] }
    })
  }, [store.plans])

  const week = weeks[weekIndex]

  const cards: WeekCard[] = weeks.map((w) => {
    const plan = w.plan
    const kicker = w.offset < 0 ? 'Last week' : w.offset === 0 ? 'This week' : 'Next week'
    const range = formatWeekRange(w.start)
    if (!plan) {
      return {
        key: w.iso,
        kicker,
        range,
        chip: w.offset < 0 ? 'No plan' : 'Not planned',
        chipClass: w.offset < 0 ? CHIP.neutral : CHIP.accent,
        meta: w.offset < 0 ? 'Nothing recorded' : 'Tap to plan',
      }
    }
    if (w.offset < 0) {
      const eaten = plan.slots.filter((s) => s.outcome === 'eaten').length
      const skipped = plan.slots.filter((s) => s.outcome === 'skipped').length
      return {
        key: w.iso,
        kicker,
        range,
        chip: 'Done',
        chipClass: CHIP.neutral,
        meta: `${eaten} eaten · ${skipped} skipped`,
      }
    }
    if (plan.status === 'draft') {
      return {
        key: w.iso,
        kicker,
        range,
        chip: 'Draft',
        chipClass: CHIP.accent,
        meta: 'Review before shopping',
      }
    }
    const done = plan.slots.filter((s) => s.outcome !== 'pending').length
    return {
      key: w.iso,
      kicker,
      range,
      chip: w.offset === 0 ? 'Shopped' : 'Locked in',
      chipClass: CHIP.sage,
      meta: w.offset === 0 ? `${done} of ${plan.slots.length} ticked` : 'List ready',
    }
  })

  /* ── Shopping ─────────────────────────────────────────────────────────── */

  const shoppingWeek =
    weeks.find((w) => w.offset === 1 && w.plan?.status === 'accepted') ??
    weeks.find((w) => w.offset === 0 && w.plan?.status === 'accepted') ??
    null

  const shoppingLines = shoppingWeek?.plan
    ? buildShoppingList(shoppingWeek.plan.slots, store.meals)
    : null

  const copyList = () => {
    if (!shoppingLines || !shoppingWeek) return
    const text = formatShoppingList(shoppingLines, formatDay(shoppingWeek.start))
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(true)
    say('Copied — go forth and shop.')
    setTimeout(() => setCopied(false), 2600)
  }

  /* ── Slot actions ─────────────────────────────────────────────────────── */

  const markEaten = (weekStart: string, index: number) => {
    store.patchSlot(weekStart, index, { outcome: 'eaten', skipReason: null })
    setSheet(null)
    setPortionFor({ weekStart, index })
  }

  const markSkipped = (weekStart: string, index: number, reason: SkipReason, label: string) => {
    store.patchSlot(weekStart, index, { outcome: 'skipped', skipReason: reason, portionFeedback: null })
    setSheet(null)
    say(`Noted — ${label.toLowerCase()}.`)
  }

  const setPortion = (weekStart: string, index: number, value: PortionFeedback, label: string) => {
    store.patchSlot(weekStart, index, { portionFeedback: value })
    setPortionFor(null)
    say(`Logged: ${label.toLowerCase()}.`)
  }

  const reroll = (weekStart: string, index: number) => {
    const plan = store.planFor(weekStart)
    if (!plan) return
    const pick = rerollSlot(plan.slots, index, store.meals, season, rngFrom(Date.now() >>> 0))
    setSheet(null)
    if (!pick) {
      say('Library’s a bit thin there — add another one?')
      return
    }
    store.patchSlot(weekStart, index, { mealId: pick.id, mealName: pick.name })
    say(`${pick.name} it is.`)
  }

  const draftWeek = (weekStart: string) => {
    const { thin } = store.draftWeek(weekStart)
    setThinHint(
      thin.length ? `Your library’s a bit thin for ${season} ${thin[0]} — worth adding one or two.` : null,
    )
    say('Here’s a draft — have a look before we shop.')
  }

  const acceptWeek = (weekStart: string) => {
    store.acceptWeek(weekStart)
    setSheet(null)
    setScreen('shop')
    say('Locked in — list’s ready.')
  }

  /* ── Sheet content ────────────────────────────────────────────────────── */

  const sheetPlan = sheet ? store.planFor(sheet.weekStart) : undefined
  const sheetSlot = sheet && sheetPlan ? sheetPlan.slots[sheet.index] : null

  const candidates = useMemo(() => {
    if (!sheet || !sheetPlan || !sheetSlot) return []
    const used = new Set<string>()
    for (const s of sheetPlan.slots) if (s.day === sheetSlot.day && s.mealId) used.add(s.mealId)
    if (sheetSlot.mealType === 'dinner') {
      for (const s of sheetPlan.slots) if (s.mealType === 'dinner' && s.mealId) used.add(s.mealId)
    }
    return eligible(store.meals, sheetSlot.mealType, season).filter(
      (m) => m.id === sheetSlot.mealId || !used.has(m.id),
    )
  }, [sheet, sheetPlan, sheetSlot, store.meals, season])

  /* ── Library ──────────────────────────────────────────────────────────── */

  const catalog = useMemo(() => {
    const counts = new Map<string, number>()
    for (const meal of store.meals) {
      for (const item of meal.ingredients) {
        if (item.name) counts.set(item.name, (counts.get(item.name) ?? 0) + 1)
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
  }, [store.meals])

  const showActionBar =
    screen === 'weeks' && week.offset >= 0 && week.plan?.status === 'draft' && !sheet && !editor
  const showFab = screen === 'library' && !editor

  const nextWeekIsDraft = weeks.some((w) => w.offset === 1 && w.plan?.status === 'draft')

  return (
    <div className="flex h-dvh justify-center overflow-hidden bg-neutral-300">
      <div className="relative flex h-dvh w-full max-w-[430px] min-h-0 flex-col overflow-hidden bg-bg shadow-[0_0_60px_rgba(46,43,37,0.18)]">
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-[104px]">
          {screen === 'weeks' && (
            <WeeksScreen
              weeks={weeks}
              cards={cards}
              selected={weekIndex}
              onSelect={(i) => {
                setWeekIndex(i)
                setSheet(null)
                setPortionFor(null)
              }}
              seasonLabel={season}
              meals={store.meals}
              stats={store.stats}
              portionFor={portionFor}
              thinHint={thinHint}
              onOpenSlot={(weekStart, index, scope) =>
                setSheet({ weekStart, index, scope, mode: 'actions' })
              }
              onTick={markEaten}
              onPortion={setPortion}
              onDismissPortion={() => setPortionFor(null)}
              onDraft={draftWeek}
              onAccept={acceptWeek}
              onReopen={(weekStart) => {
                store.reopenWeek(weekStart)
                say('Back to draft — tweak away.')
              }}
              onGoShop={() => setScreen('shop')}
              onGoWeek={(index) => {
                setScreen('weeks')
                setWeekIndex(index)
              }}
              onEditMeal={(meal) => {
                setScreen('library')
                setEditor({ meal })
              }}
            />
          )}

          {screen === 'library' && (
            <LibraryScreen
              meals={store.meals}
              stats={store.stats}
              query={query}
              onQuery={setQuery}
              onEditMeal={(meal) => setEditor({ meal })}
            />
          )}

          {screen === 'shop' && (
            <ShoppingScreen
              lines={shoppingLines}
              weekLabel={shoppingWeek ? formatWeekRange(shoppingWeek.start) : ''}
              ticked={shoppingWeek ? (store.ticked[shoppingWeek.iso] ?? {}) : {}}
              copied={copied}
              emptyNote={
                nextWeekIsDraft
                  ? 'Next week’s still a draft. Lock it in and the list builds itself.'
                  : 'Draft next week’s meals and the list builds itself from what you plan.'
              }
              onToggle={(key) => shoppingWeek && store.toggleTick(shoppingWeek.iso, key)}
              onCopy={copyList}
              onPlan={() => {
                setScreen('weeks')
                setWeekIndex(2)
              }}
            />
          )}
        </div>

        {showActionBar && (
          <div className="absolute right-[14px] bottom-20 left-[14px] z-[7] flex gap-2">
            <button
              type="button"
              aria-label="Roll the whole week again"
              onClick={() => draftWeek(week.iso)}
              className="btn btn-secondary h-13 w-13 flex-none p-0 shadow-md"
            >
              <ShuffleIcon size={19} />
            </button>
            <button
              type="button"
              onClick={() => acceptWeek(week.iso)}
              className="btn btn-primary h-13 flex-1 gap-2 text-[15px] font-bold shadow-lg"
            >
              Looks good — build the list
              <ArrowRightIcon size={16} />
            </button>
          </div>
        )}

        <TabBar
          screen={screen}
          dots={{
            weeks: weeks.some((w) => w.offset === 1 && !w.plan),
            shop: !!shoppingLines,
          }}
          onPick={(next) => {
            setScreen(next)
            setPortionFor(null)
          }}
        />

        {showFab && (
          <button
            type="button"
            onClick={() => setEditor({ meal: null })}
            className="btn btn-primary absolute right-[18px] bottom-[88px] z-[7] gap-2 px-5 py-[14px] text-[14.5px] font-bold shadow-lg"
          >
            <PlusIcon size={18} />
            New meal
          </button>
        )}

        {sheet && sheetSlot && (
          <BottomSheet
            kicker={`${sheet.scope === 'live' ? 'This week' : 'Planned'} · ${DAY_NAMES[sheetSlot.day]} ${sheetSlot.mealType}`}
            title={
              sheet.mode === 'pick'
                ? `Pick a ${sheetSlot.mealType}`
                : sheet.mode === 'skip'
                  ? 'What happened?'
                  : sheetSlot.mealName
            }
            note={
              sheet.mode === 'actions' && sheet.scope === 'live'
                ? 'The shopping’s already done for this week, so the plan stays put — just tell me how it went.'
                : null
            }
            onClose={() => setSheet(null)}
          >
            {sheet.mode === 'actions' && (
              <div className="mt-4 flex flex-col gap-[7px]">
                {sheet.scope === 'live' ? (
                  <>
                    <SheetRow
                      onClick={() => markEaten(sheet.weekStart, sheet.index)}
                      className="flex items-center gap-3"
                    >
                      <span className="text-[15px]">✅</span> We ate it
                    </SheetRow>
                    <SheetRow
                      onClick={() => setSheet({ ...sheet, mode: 'skip' })}
                      className="flex items-center gap-3"
                    >
                      <span className="text-[15px]">🙈</span> We didn’t eat it
                    </SheetRow>
                  </>
                ) : (
                  <>
                    <SheetRow
                      onClick={() => reroll(sheet.weekStart, sheet.index)}
                      className="flex items-center gap-3"
                    >
                      <span className="text-[15px]">🎲</span> Roll something else
                    </SheetRow>
                    <SheetRow
                      onClick={() => setSheet({ ...sheet, mode: 'pick' })}
                      className="flex items-center gap-3"
                    >
                      <span className="text-[15px]">📖</span> Pick from the library
                    </SheetRow>
                    <SheetRow
                      onClick={() => {
                        store.patchSlot(sheet.weekStart, sheet.index, { locked: !sheetSlot.locked })
                        setSheet(null)
                        say(sheetSlot.locked ? 'Unlocked.' : 'Locked — a re-roll won’t touch it.')
                      }}
                      className="flex items-center gap-3"
                    >
                      <span className="text-[15px]">{sheetSlot.locked ? '🔓' : '🔒'}</span>
                      {sheetSlot.locked ? 'Unlock this slot' : 'Lock this slot'}
                    </SheetRow>
                  </>
                )}
              </div>
            )}

            {sheet.mode === 'pick' && (
              <div className="mt-[14px] flex flex-col gap-[6px]">
                {candidates.map((meal) => (
                  <SheetRow
                    key={meal.id}
                    onClick={() => {
                      store.patchSlot(sheet.weekStart, sheet.index, {
                        mealId: meal.id,
                        mealName: meal.name,
                      })
                      setSheet(null)
                      say(`${meal.name} — good shout.`)
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

            {sheet.mode === 'skip' && (
              <div className="mt-[14px] flex flex-col gap-[6px]">
                {SKIP_REASONS.map((reason) => (
                  <SheetRow
                    key={reason.value}
                    onClick={() => markSkipped(sheet.weekStart, sheet.index, reason.value, reason.label)}
                    className="rounded-[14px]"
                  >
                    {reason.label}
                  </SheetRow>
                ))}
              </div>
            )}
          </BottomSheet>
        )}

        {editor && (
          <MealEditor
            meal={editor.meal}
            catalog={catalog}
            warning={editor.meal ? portionWarning(store.stats.get(editor.meal.id)) : null}
            onCancel={() => setEditor(null)}
            onSave={(meal) => {
              const isNew = !editor.meal
              store.saveMeal({ ...meal, id: meal.id || newId() })
              setEditor(null)
              setScreen('library')
              say(isNew ? `${meal.name} is in the larder.` : `${meal.name} updated.`)
            }}
          />
        )}

        {toast && <Toast message={toast} />}
      </div>
    </div>
  )
}
