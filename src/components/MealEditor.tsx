import { useMemo, useState } from 'react'
import { newId } from '../lib/storage'
import { round1 } from '../lib/shoppingList'
import {
  CARB_BASES,
  MEAL_TYPES,
  PROTEINS,
  SEASONS,
  UNITS,
  type CarbBase,
  type Meal,
  type MealIngredient,
  type MealType,
  type Protein,
  type Season,
  type Unit,
} from '../types'
import { ArrowLeftIcon, MinusIcon, PlusIcon } from './icons'

interface MealEditorProps {
  meal: Meal | null
  /** Ingredient names already used across the library, most common first. */
  catalog: string[]
  warning: string | null
  onSave: (meal: Meal) => void
  onCancel: () => void
}

function blankIngredient(name = '', quantity = 1, unit: Unit = 'g'): MealIngredient {
  return { ingredientId: name.toLowerCase() || newId(), name, quantity, unit }
}

function chipClass(on: boolean): string {
  return on
    ? 'bg-accent-200 border-accent-500 text-accent-800'
    : 'bg-bg border-neutral-300 text-neutral-600'
}

const LABEL = 'text-[12px] font-bold tracking-[0.04em] uppercase text-neutral-600'

export function MealEditor({ meal, catalog, warning, onSave, onCancel }: MealEditorProps) {
  const [name, setName] = useState(meal?.name ?? '')
  const [mealTypes, setMealTypes] = useState<MealType[]>(meal?.mealTypes ?? ['dinner'])
  const [protein, setProtein] = useState<Protein>(meal?.protein ?? 'chicken')
  const [carbBase, setCarbBase] = useState<CarbBase>(meal?.carbBase ?? 'none')
  const [seasons, setSeasons] = useState<Season[]>(meal?.seasons ?? SEASONS.slice())
  const [rows, setRows] = useState<MealIngredient[]>(
    meal?.ingredients.length ? meal.ingredients.map((i) => ({ ...i })) : [blankIngredient()],
  )
  const [error, setError] = useState<string | null>(null)

  const suggestions = useMemo(() => {
    const used = new Set(rows.map((r) => r.name.trim().toLowerCase()).filter(Boolean))
    return catalog.filter((n) => !used.has(n.toLowerCase())).slice(0, 6)
  }, [catalog, rows])

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

  const patchRow = (index: number, changes: Partial<MealIngredient>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...changes } : row)))

  const step = (unit: Unit) => (unit === 'g' || unit === 'ml' ? 50 : 1)

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Give it a name first.')
      return
    }
    const ingredients = rows
      .filter((row) => row.name.trim())
      .map((row) => ({
        ...row,
        name: row.name.trim(),
        ingredientId: row.ingredientId || row.name.trim().toLowerCase(),
        quantity: Number(row.quantity) || 0,
      }))
    onSave({
      id: meal?.id ?? newId(),
      name: trimmed,
      mealTypes: mealTypes.length ? mealTypes : ['dinner'],
      protein,
      carbBase,
      seasons: seasons.length ? seasons : SEASONS.slice(),
      ingredients,
      effort: meal?.effort,
      archived: meal?.archived ?? false,
    })
  }

  return (
    <div className="animate-fade absolute inset-0 z-[12] flex flex-col bg-bg">
      <div className="flex flex-none items-center gap-3 border-b border-divider px-[18px] pt-5 pb-3">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Back"
          className="flex cursor-pointer border-none bg-transparent p-1 text-inherit"
        >
          <ArrowLeftIcon size={22} />
        </button>
        <span className="font-heading text-[20px]">{meal ? 'Edit meal' : 'New meal'}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-[18px] pt-4 pb-6">
        <div className="mb-4">
          <label className={`${LABEL} mb-[5px] block`} htmlFor="meal-name">
            Name
          </label>
          <input
            id="meal-name"
            className="input text-[16px]"
            placeholder="Sausage pasta bake"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
          />
          {error && <div className="mt-2 text-[12px] font-semibold text-accent-700">{error}</div>}
        </div>

        <div className="mb-4">
          <div className={`${LABEL} mb-2`}>Good for</div>
          <div className="flex gap-[7px]">
            {MEAL_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={mealTypes.includes(type)}
                onClick={() => setMealTypes((prev) => toggle(prev, type))}
                className={`flex-1 cursor-pointer rounded-full border-[1.5px] px-1 py-[10px] text-[13px] font-bold ${chipClass(
                  mealTypes.includes(type),
                )}`}
              >
                {type[0].toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className={`${LABEL} mb-[5px] block`} htmlFor="meal-protein">
              Protein
            </label>
            <select
              id="meal-protein"
              className="input"
              value={protein}
              onChange={(e) => setProtein(e.target.value as Protein)}
            >
              {PROTEINS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`${LABEL} mb-[5px] block`} htmlFor="meal-carb">
              Carb base
            </label>
            <select
              id="meal-carb"
              className="input"
              value={carbBase}
              onChange={(e) => setCarbBase(e.target.value as CarbBase)}
            >
              {CARB_BASES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-5">
          <div className={`${LABEL} mb-2`}>Seasons</div>
          <div className="flex gap-[6px]">
            {SEASONS.map((season) => (
              <button
                key={season}
                type="button"
                aria-pressed={seasons.includes(season)}
                onClick={() => setSeasons((prev) => toggle(prev, season))}
                className={`flex-1 cursor-pointer rounded-full border-[1.5px] px-[2px] py-[9px] text-[12px] font-bold ${chipClass(
                  seasons.includes(season),
                )}`}
              >
                {season[0].toUpperCase() + season.slice(1, 3)}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-[18px] h-px bg-divider" />

        <div className="flex items-baseline justify-between gap-[10px]">
          <span className="font-heading text-[18px]">Main ingredients</span>
          <span className="text-[11.5px] font-medium text-neutral-600">Skip the staples</span>
        </div>

        {warning && (
          <div className="mt-[10px] rounded-[14px] border-[1.5px] border-accent-300 bg-accent-100 px-[13px] py-[11px] text-[12px] leading-[1.45] font-semibold text-accent-800">
            {warning}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-[6px]">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() =>
                  setRows((prev) => [
                    ...prev.filter((row) => row.name.trim()),
                    blankIngredient(suggestion),
                  ])
                }
                className="flex cursor-pointer items-center gap-[5px] rounded-full border-[1.5px] border-dashed border-sage-400 bg-sage-100 px-3 py-[7px] text-[12px] font-semibold text-sage-800 hover:border-solid hover:bg-sage-200"
              >
                <PlusIcon size={11} strokeWidth={3.4} />
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2">
          {rows.map((row, index) => (
            <div
              key={index}
              className="rounded-md border-[1.5px] border-neutral-200 bg-neutral-100 px-[11px] py-[10px]"
            >
              <div className="flex items-center gap-2">
                <input
                  className="input flex-1 py-2 text-[15px]"
                  list="larder-ingredients"
                  placeholder="Ingredient"
                  aria-label="Ingredient name"
                  value={row.name}
                  onChange={(e) => patchRow(index, { name: e.target.value })}
                />
                <button
                  type="button"
                  aria-label="Remove ingredient"
                  onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                  className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full border-[1.5px] border-neutral-300 bg-bg text-neutral-600 hover:border-accent-500 hover:text-accent-700"
                >
                  <MinusIcon size={14} />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Less"
                  onClick={() =>
                    patchRow(index, {
                      quantity: Math.max(0, round1((Number(row.quantity) || 0) - step(row.unit))),
                    })
                  }
                  className="h-[34px] w-[34px] flex-none cursor-pointer rounded-full border-[1.5px] border-neutral-300 bg-bg text-[17px] font-bold text-accent-700"
                >
                  −
                </button>
                <input
                  className="input w-[70px] py-2 text-center text-[15px] font-bold"
                  inputMode="decimal"
                  aria-label="Quantity"
                  value={String(row.quantity)}
                  onChange={(e) =>
                    patchRow(index, {
                      quantity: e.target.value === '' ? 0 : Number(e.target.value) || 0,
                    })
                  }
                />
                <button
                  type="button"
                  aria-label="More"
                  onClick={() =>
                    patchRow(index, { quantity: round1((Number(row.quantity) || 0) + step(row.unit)) })
                  }
                  className="h-[34px] w-[34px] flex-none cursor-pointer rounded-full border-[1.5px] border-neutral-300 bg-bg text-[17px] font-bold text-accent-700"
                >
                  +
                </button>
                <select
                  className="input flex-1 py-2 text-[14px]"
                  aria-label="Unit"
                  value={row.unit}
                  onChange={(e) => patchRow(index, { unit: e.target.value as Unit })}
                >
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, blankIngredient()])}
          className="mt-[10px] flex w-full cursor-pointer items-center justify-center gap-[7px] rounded-full border-[1.5px] border-dashed border-neutral-400 bg-transparent py-3 text-[14px] font-bold text-neutral-700 hover:border-accent-500 hover:text-accent-700"
        >
          <PlusIcon size={15} />
          Another ingredient
        </button>
        <div className="h-20" />
      </div>

      <div className="flex flex-none gap-[9px] border-t border-divider bg-neutral-100 px-[18px] pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <button type="button" className="btn btn-ghost flex-none px-[18px] py-3 font-semibold" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary flex-1 py-3 text-[15px] font-bold" onClick={save}>
          {meal ? 'Save changes' : 'Add to larder'}
        </button>
      </div>

      <datalist id="larder-ingredients">
        {catalog.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </div>
  )
}
