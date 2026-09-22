/**
 * The maths behind `SwipeRow`: when a drag counts as a swipe, where a released
 * card settles, and how far it can be pulled past its limits. Kept separate so
 * it can be tested without a DOM.
 */

/** Pointer travel (px) past which a gesture is a swipe, not a tap. */
export const SWIPE_SLOP = 6

/** Fraction of the tray that must be revealed for a slow drag to stick open. */
const OPEN_FRACTION = 0.45

/** px/ms — above this the flick decides, however far the finger actually got. */
const FLICK_VELOCITY = 0.35

/**
 * Where a released drag should settle. `offset` is how far the card has been
 * pulled left (0 = closed, `trayWidth` = fully open); `velocity` is px/ms,
 * negative when the finger is still travelling left.
 */
export function settleOpen(offset: number, trayWidth: number, velocity: number): boolean {
  if (trayWidth <= 0) return false
  if (velocity <= -FLICK_VELOCITY) return true
  if (velocity >= FLICK_VELOCITY) return false
  return offset >= trayWidth * OPEN_FRACTION
}

/**
 * Clamp a raw drag to the tray, easing off past either end so the card feels
 * tethered rather than stuck.
 */
export function rubberBand(offset: number, trayWidth: number): number {
  if (offset < 0) return offset * 0.35
  if (offset > trayWidth) return trayWidth + (offset - trayWidth) * 0.35
  return offset
}
