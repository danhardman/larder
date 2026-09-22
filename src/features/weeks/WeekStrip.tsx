import { useEffect, useRef } from 'react'

export interface WeekCard {
  key: string
  kicker: string
  range: string
  chip: string
  chipClass: string
  meta: string
}

interface WeekStripProps {
  weeks: WeekCard[]
  selected: number
  onSelect: (index: number) => void
}

export function WeekStrip({ weeks, selected, onSelect }: WeekStripProps) {
  const stripRef = useRef<HTMLDivElement>(null)
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const scrollToWeek = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const strip = stripRef.current
    const card = strip?.children[index] as HTMLElement | undefined
    if (!strip || !card) return
    strip.scrollTo({ left: card.offsetLeft - (strip.clientWidth - card.clientWidth) / 2, behavior })
  }

  // Centre the selected week on mount, once fonts have settled the widths.
  useEffect(() => {
    scrollToWeek(selected, 'auto')
    const frame = requestAnimationFrame(() => scrollToWeek(selected, 'auto'))
    const late = setTimeout(() => scrollToWeek(selected, 'auto'), 300)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(late)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollToWeek(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  useEffect(() => () => clearTimeout(settle.current), [])

  // Swiping the strip selects whichever card ends up nearest the centre.
  const onScroll = () => {
    clearTimeout(settle.current)
    settle.current = setTimeout(() => {
      const strip = stripRef.current
      if (!strip || !strip.children.length) return
      const mid = strip.scrollLeft + strip.clientWidth / 2
      let best = 0
      let bestDistance = Infinity
      for (let i = 0; i < strip.children.length; i++) {
        const card = strip.children[i] as HTMLElement
        const distance = Math.abs(card.offsetLeft + card.clientWidth / 2 - mid)
        if (distance < bestDistance) {
          bestDistance = distance
          best = i
        }
      }
      if (best !== selected) onSelect(best)
    }, 130)
  }

  return (
    <div
      ref={stripRef}
      onScroll={onScroll}
      className="no-scrollbar flex snap-x snap-mandatory gap-[10px] overflow-x-auto px-5 pt-[2px] pb-1"
    >
      {weeks.map((week, i) => {
        const active = i === selected
        return (
          <button
            key={week.key}
            type="button"
            onClick={() => onSelect(i)}
            className={`w-[74%] flex-none snap-center cursor-pointer rounded-md border-[1.5px] px-[14px] py-3 text-left text-inherit shadow-sm ${
              active
                ? 'border-accent-500 bg-accent-100 opacity-100'
                : 'border-neutral-200 bg-neutral-100 opacity-60'
            }`}
          >
            <div
              className={`text-[10px] font-bold tracking-[0.1em] uppercase ${
                active ? 'text-accent-800' : 'text-neutral-500'
              }`}
            >
              {week.kicker}
            </div>
            <div className="mt-[5px] font-heading text-[19px] leading-[1.1]">{week.range}</div>
            <div className="mt-[9px] flex items-center gap-[7px]">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-[9px] py-[3px] text-[10px] font-bold ${week.chipClass}`}
              >
                {week.chip}
              </span>
              <span className="text-[11px] font-semibold text-neutral-600">{week.meta}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
