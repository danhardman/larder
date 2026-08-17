import { BasketIcon, BookIcon, CalendarIcon } from './icons'

export type Screen = 'weeks' | 'library' | 'shop'

const TABS: { id: Screen; label: string; Icon: typeof CalendarIcon }[] = [
  { id: 'weeks', label: 'Weeks', Icon: CalendarIcon },
  { id: 'library', label: 'Library', Icon: BookIcon },
  { id: 'shop', label: 'Shopping', Icon: BasketIcon },
]

interface TabBarProps {
  screen: Screen
  dots: Partial<Record<Screen, boolean>>
  onPick: (screen: Screen) => void
}

export function TabBar({ screen, dots, onPick }: TabBarProps) {
  return (
    <nav className="absolute right-0 bottom-0 left-0 z-[8] grid grid-cols-3 gap-1 border-t border-divider bg-neutral-100 px-[10px] pt-2 pb-[calc(10px+env(safe-area-inset-bottom))]">
      {TABS.map(({ id, label, Icon }) => {
        const active = screen === id
        return (
          <button
            key={id}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onPick(id)}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-[14px] border-none bg-transparent pt-[6px] pb-1 ${
              active ? 'text-accent-800' : 'text-neutral-600'
            }`}
          >
            <span
              className={`relative flex h-[26px] w-11 items-center justify-center rounded-full ${
                active ? 'bg-accent-200' : 'bg-transparent'
              }`}
            >
              <Icon />
              {dots[id] && (
                <span className="absolute top-0 right-[6px] h-2 w-2 rounded-full border-[1.5px] border-neutral-100 bg-accent-500" />
              )}
            </span>
            <span className="text-[10.5px] font-bold tracking-[0.01em]">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
