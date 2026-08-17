import { portionWarning, type MealStats } from '../lib/stats'
import type { Meal } from '../types'
import { AlertIcon, SearchIcon } from '../components/icons'

interface LibraryScreenProps {
  meals: Meal[]
  stats: Map<string, MealStats>
  query: string
  onQuery: (query: string) => void
  onEditMeal: (meal: Meal) => void
}

export function LibraryScreen({ meals, stats, query, onQuery, onEditMeal }: LibraryScreenProps) {
  const active = meals.filter((m) => !m.archived)
  const needle = query.trim().toLowerCase()
  const results = active.filter((m) => !needle || m.name.toLowerCase().includes(needle))

  return (
    <div>
      <div className="px-5 pt-[26px]">
        <div className="font-heading text-[30px] leading-none">Meals we eat</div>
        <div className="mt-[7px] text-[13px] font-medium text-neutral-600">
          {active.length} meals · tap one to edit
        </div>
        <div className="relative mt-[14px]">
          <SearchIcon size={16} className="absolute top-[14px] left-[15px] text-neutral-500" />
          <input
            className="input pl-10"
            placeholder="Search meals"
            aria-label="Search meals"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-[9px] px-5 pt-[14px]">
        {results.map((meal) => {
          const warning = portionWarning(stats.get(meal.id))
          const tags = [
            ...meal.mealTypes,
            ...(meal.protein === 'none' ? [] : [meal.protein]),
            ...(meal.seasons.length === 4 ? [] : ['seasonal']),
          ]
          return (
            <button
              key={meal.id}
              type="button"
              onClick={() => onEditMeal(meal)}
              className="cursor-pointer rounded-md border-[1.5px] border-neutral-200 bg-neutral-100 px-[14px] py-[13px] text-left text-inherit shadow-sm hover:border-accent-400"
            >
              <div className="flex items-baseline justify-between gap-[10px]">
                <span className="text-[16px] font-bold">{meal.name}</span>
                <span className="flex-none text-[11px] font-semibold text-neutral-500">
                  {meal.ingredients.length} ingredients
                </span>
              </div>
              <div className="mt-[9px] flex flex-wrap gap-[5px]">
                {tags.map((tag) => (
                  <span key={tag} className="tag tag-outline px-[9px] py-[2.5px] text-[10.5px]">
                    {tag}
                  </span>
                ))}
              </div>
              {warning && (
                <div className="mt-[9px] flex items-start gap-[7px] text-[11.5px] leading-[1.4] font-semibold text-accent-800">
                  <AlertIcon size={14} className="mt-px flex-none" />
                  {warning}
                </div>
              )}
            </button>
          )
        })}

        {results.length === 0 && (
          <div className="px-1 py-[26px] text-[13.5px] leading-[1.5] text-neutral-600">
            Nothing by that name yet — want to add it?
          </div>
        )}
      </div>
      <div className="h-6" />
    </div>
  )
}
