import { useEffect, useState } from 'react'
import { portionWarning, type MealStats } from '../lib/stats'
import type { Meal } from '../types'
import { SwipeAction, SwipeRow } from '../components/SwipeRow'
import { AlertIcon, ArchiveIcon, SearchIcon, TrashIcon, UndoIcon } from '../components/icons'

interface LibraryScreenProps {
  meals: Meal[]
  stats: Map<string, MealStats>
  query: string
  onQuery: (query: string) => void
  showArchived: boolean
  onShowArchived: (show: boolean) => void
  /** Meals a plan still points at — those can be archived but not deleted. */
  usedMealIds: Set<string>
  onEditMeal: (meal: Meal) => void
  onArchive: (meal: Meal) => void
  onRestore: (meal: Meal) => void
  onDelete: (meal: Meal) => void
}

export function LibraryScreen({
  meals,
  stats,
  query,
  onQuery,
  showArchived,
  onShowArchived,
  usedMealIds,
  onEditMeal,
  onArchive,
  onRestore,
  onDelete,
}: LibraryScreenProps) {
  const active = meals.filter((m) => !m.archived)
  const archivedCount = meals.length - active.length
  const needle = query.trim().toLowerCase()
  const results = (showArchived ? meals : active).filter(
    (m) => !needle || m.name.toLowerCase().includes(needle),
  )

  // Only one tray open at a time, and never one belonging to a card that just
  // slid out from under the finger.
  const [openId, setOpenId] = useState<string | null>(null)
  useEffect(() => setOpenId(null), [query, showArchived])

  return (
    <div>
      <div className="px-5 pt-[26px]">
        <div className="font-heading text-[30px] leading-none">Meals we eat</div>
        <div className="mt-[7px] text-[13px] font-medium text-neutral-600">
          {active.length} meals · tap one to edit, swipe for more
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
        {archivedCount > 0 && (
          <button
            type="button"
            aria-pressed={showArchived}
            onClick={() => onShowArchived(!showArchived)}
            className={`tag mt-[11px] cursor-pointer border font-semibold ${
              showArchived
                ? 'border-accent bg-accent-200 text-accent-800'
                : 'border-neutral-400 bg-transparent text-neutral-600'
            }`}
          >
            {showArchived ? 'Hide' : 'Show'} archived ({archivedCount})
          </button>
        )}
      </div>

      <div className="flex flex-col gap-[9px] px-5 pt-[14px]">
        {results.map((meal) => {
          const warning = portionWarning(stats.get(meal.id))
          const inUse = usedMealIds.has(meal.id)
          const tags = [
            ...meal.mealTypes,
            ...(meal.protein === 'none' ? [] : [meal.protein]),
            ...(meal.seasons.length === 4 ? [] : ['seasonal']),
          ]
          return (
            <SwipeRow
              key={meal.id}
              open={openId === meal.id}
              onOpenChange={(open) => setOpenId(open ? meal.id : null)}
              actionsLabel={`Actions for ${meal.name}`}
              actions={
                <>
                  {meal.archived ? (
                    <SwipeAction
                      label="Restore"
                      tone="sage"
                      icon={<UndoIcon size={17} />}
                      onClick={() => onRestore(meal)}
                    />
                  ) : (
                    <SwipeAction
                      label="Archive"
                      tone="sage"
                      icon={<ArchiveIcon size={17} />}
                      onClick={() => onArchive(meal)}
                    />
                  )}
                  {!inUse && (
                    <SwipeAction
                      label="Delete"
                      tone="accent"
                      icon={<TrashIcon size={17} />}
                      onClick={() => onDelete(meal)}
                    />
                  )}
                </>
              }
            >
              <button
                type="button"
                onClick={() => onEditMeal(meal)}
                className={`w-full cursor-pointer rounded-md border-[1.5px] border-neutral-200 bg-neutral-100 px-[14px] py-[13px] text-left text-inherit shadow-sm hover:border-accent-400 ${
                  meal.archived ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-baseline justify-between gap-[10px]">
                  <span className="text-[16px] font-bold">{meal.name}</span>
                  <span className="flex-none text-[11px] font-semibold text-neutral-500">
                    {meal.ingredients.length} ingredients
                  </span>
                </div>
                <div className="mt-[9px] flex flex-wrap gap-[5px]">
                  {meal.archived && (
                    <span className="tag bg-neutral-300 px-[9px] py-[2.5px] text-[10.5px] text-neutral-700">
                      archived
                    </span>
                  )}
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
            </SwipeRow>
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
