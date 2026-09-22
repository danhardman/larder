/**
 * The shopping list (spec §5): what to buy for a week, summed across meals,
 * with a per-meal breakdown so you can see why. Pure; `features/shopping` renders it.
 */

import { isAway, type Meal, type Slot, type Unit } from '../types'

/** One meal's share of a shopping line. */
export interface Contribution {
  mealName: string
  /** Amount this meal calls for on its own. */
  each: number
  /** How many times the meal appears in the week. */
  times: number
}

/** One thing to buy: an ingredient in one unit, summed across the week. */
export interface ShoppingLine {
  ingredientId: string
  name: string
  unit: Unit
  total: number
  contributions: Contribution[]
}

/** Round to one decimal place, for displaying quantities without float noise. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * The key a line is ticked under on the week plan. Ingredient id rather than name:
 * the catalog makes "Chicken Thighs" and "chicken thighs" one id, and a rename
 * doesn't lose the tick.
 */
export const lineKey = (line: Pick<ShoppingLine, 'ingredientId' | 'unit'>) => `${line.ingredientId}|${line.unit}`

/**
 * Group by (ingredient, unit) and sum — you can only add compatible units, so
 * `500 g` and `2 piece` of the same ingredient stay separate lines. The ingredient
 * is its catalog id (spec §5's "group by name", now that a name has one id); a
 * hand-edited document without one falls back to the name. Pure: no Firebase.
 */
export function buildShoppingList(slots: Slot[], meals: Meal[]): ShoppingLine[] {
  const byId = new Map(meals.map((m) => [m.id, m]))
  const groups = new Map<string, ShoppingLine>()

  for (const slot of slots) {
    if (isAway(slot)) continue
    const meal = slot.mealId ? byId.get(slot.mealId) : undefined
    if (!meal) continue
    for (const item of meal.ingredients) {
      if (!item.name.trim()) continue
      const ingredientId = item.ingredientId || item.name.trim().toLowerCase()
      const key = lineKey({ ingredientId, unit: item.unit })
      let line = groups.get(key)
      if (!line) {
        line = { ingredientId, name: item.name, unit: item.unit, total: 0, contributions: [] }
        groups.set(key, line)
      }
      line.total = round1(line.total + item.quantity)
      const existing = line.contributions.find((c) => c.mealName === meal.name)
      if (existing) existing.times += 1
      else line.contributions.push({ mealName: meal.name, each: item.quantity, times: 1 })
    }
  }

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** One meal's share of a line, e.g. "Chilli ×2 (400 g each)" — shown under each line. */
export function formatContribution(c: Contribution, unit: Unit): string {
  return c.times > 1
    ? `${c.mealName} ×${c.times} (${round1(c.each)} ${unit} each)`
    : `${c.mealName} ${round1(c.each)} ${unit}`
}

/**
 * The whole list as plain text for the clipboard, headed by the week.
 *
 * Shaped for where it actually lands: the iOS Notes app, where you paste it, Select All and
 * tap the checklist button. That turns every line into a checkbox — so there are no blank
 * lines anywhere, and never the `↳` breakdown lines, each of which would become a
 * checkbox for something you can't buy. One line in, one thing to tick off in the shop.
 *
 * The breakdown stays on screen, where it helps you judge pack sizes without following you
 * into the list; that's why this takes no `expanded` flag.
 */
export function formatShoppingList(lines: ShoppingLine[], weekLabel: string): string {
  const body = lines.map((line) => `${round1(line.total)} ${line.unit} — ${line.name}`).join('\n')
  return `Shopping list — w/c ${weekLabel}\n${body}\n`
}
