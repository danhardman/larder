import type { ReactNode } from 'react'

/**
 * Lucide paths, inlined. The design system asks for stroke-width 2.75 for a
 * rounder, heavier look, so that's the default here.
 */
interface IconProps {
  size?: number
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
}

function icon(children: ReactNode, defaultStroke = 2.75) {
  return function Icon({ size = 18, strokeWidth = defaultStroke, className, style }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
        aria-hidden="true"
      >
        {children}
      </svg>
    )
  }
}

export const CalendarIcon = icon(
  <>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M8 3v4M16 3v4M3 11h18" />
  </>,
)

export const BookIcon = icon(
  <>
    <path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z" />
    <path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z" />
  </>,
)

export const BasketIcon = icon(
  <>
    <path d="M4 6h16l-1.5 12a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8z" />
    <path d="M9 6V4.5a3 3 0 0 1 6 0V6" />
  </>,
)

export const CheckIcon = icon(<path d="M20 6 9 17l-5-5" />, 3.2)

export const PlusIcon = icon(<path d="M12 5v14M5 12h14" />, 3)

export const MinusIcon = icon(<path d="M5 12h14" />, 3)

export const CloseIcon = icon(<path d="M18 6 6 18M6 6l12 12" />)

export const ArrowRightIcon = icon(
  <>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </>,
  3,
)

export const ArrowLeftIcon = icon(
  <>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </>,
)

export const AlertIcon = icon(
  <>
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
    <circle cx="12" cy="12" r="9" />
  </>,
)

export const ShuffleIcon = icon(
  <>
    <path d="M16 3h5v5" />
    <path d="M21 3 13.5 10.5" />
    <path d="M8 21H3v-5" />
    <path d="M3 21 10.5 13.5" />
    <path d="M21 16v5h-5" />
    <path d="M3 8V3h5" />
  </>,
)

export const LockIcon = icon(
  <>
    <rect x="4" y="11" width="16" height="10" rx="2.5" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </>,
  3,
)

export const SearchIcon = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
)

export const CopyIcon = icon(
  <>
    <rect x="9" y="9" width="12" height="12" rx="2.5" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </>,
)
