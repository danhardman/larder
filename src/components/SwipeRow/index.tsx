import { useEffect, useRef, useState, type ReactNode } from 'react'
import { rubberBand, settleOpen, SWIPE_SLOP } from './swipeGesture'

interface SwipeRowProps {
  /** Controlled by the list, so only one row is ever open. */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Buttons revealed behind the right edge. */
  actions: ReactNode
  /** Accessible name for the action tray. */
  actionsLabel: string
  children: ReactNode
}

/**
 * A card you can drag left to uncover actions. No gesture library: the wrapper
 * sets `touch-action: pan-y`, so the browser keeps owning vertical scrolling and
 * hands us only the horizontal moves.
 */
export function SwipeRow({ open, onOpenChange, actions, actionsLabel, children }: SwipeRowProps) {
  const trayRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)

  // Live gesture bookkeeping — refs, not state, so a move doesn't re-render twice.
  const drag = useRef<{ startX: number; trayWidth: number; lastX: number; lastT: number; velocity: number } | null>(
    null,
  )
  const moved = useRef(false)

  // The parent may close this row (another row opened, the filter changed), so
  // the resting position follows `open` whenever a drag isn't in charge.
  useEffect(() => {
    if (drag.current) return
    setOffset(open ? (trayRef.current?.offsetWidth ?? 0) : 0)
  }, [open])

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const trayWidth = trayRef.current?.offsetWidth ?? 0
    drag.current = {
      startX: e.clientX,
      trayWidth,
      lastX: e.clientX,
      lastT: e.timeStamp,
      velocity: 0,
    }
    moved.current = false
    setDragging(true)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dt = e.timeStamp - d.lastT
    if (dt > 0) d.velocity = (e.clientX - d.lastX) / dt
    d.lastX = e.clientX
    d.lastT = e.timeStamp

    const travelled = d.startX - e.clientX
    if (Math.abs(travelled) > SWIPE_SLOP && !moved.current) {
      moved.current = true
      // Only claim the pointer once we know it's a swipe, so a plain tap still
      // lands on the card underneath.
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (!moved.current) return
    setOffset(rubberBand((open ? d.trayWidth : 0) + travelled, d.trayWidth))
  }

  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    drag.current = null
    setDragging(false)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    if (!moved.current) {
      setOffset(open ? d.trayWidth : 0)
      return
    }
    const next = settleOpen(offset, d.trayWidth, d.velocity)
    setOffset(next ? d.trayWidth : 0)
    if (next !== open) onOpenChange(next)
  }

  return (
    <div
      className="relative overflow-hidden rounded-md"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={(e) => {
        // A swipe shouldn't also fire the card's onClick; nor should the tap
        // that puts an open row away.
        if (!moved.current && !open) return
        e.preventDefault()
        e.stopPropagation()
        if (open) onOpenChange(false)
      }}
    >
      <div
        ref={trayRef}
        aria-label={actionsLabel}
        aria-hidden={!open}
        // Inert while closed: the buttons sit under the card, so tabbing to one
        // would focus something nobody can see.
        inert={!open || undefined}
        className="absolute inset-y-0 right-0 flex"
      >
        {actions}
      </div>
      <div
        className={dragging ? '' : 'transition-transform duration-200 ease-out'}
        style={{ transform: `translateX(${-offset}px)` }}
      >
        {children}
      </div>
    </div>
  )
}

/** One tray button — full height, icon over label, sized to fit two side by side. */
export function SwipeAction({
  label,
  icon,
  tone,
  onClick,
}: {
  label: string
  icon: ReactNode
  tone: 'sage' | 'accent'
  onClick: () => void
}) {
  const colours =
    tone === 'sage' ? 'bg-sage-600 text-sage-100 active:bg-sage-700' : 'bg-accent-600 text-accent-100 active:bg-accent-700'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-[74px] cursor-pointer flex-col items-center justify-center gap-[5px] border-none text-[11px] font-bold ${colours}`}
    >
      {icon}
      {label}
    </button>
  )
}
