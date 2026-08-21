import { describe, expect, it } from 'vitest'
import { rubberBand, settleOpen } from './swipe'

const TRAY = 150

describe('settleOpen', () => {
  it('snaps back when the drag stalls short of the threshold', () => {
    expect(settleOpen(40, TRAY, 0)).toBe(false)
  })

  it('sticks open once past the threshold', () => {
    expect(settleOpen(80, TRAY, 0)).toBe(true)
  })

  it('lets a leftward flick win from barely any travel', () => {
    expect(settleOpen(12, TRAY, -0.9)).toBe(true)
  })

  it('lets a rightward flick close an almost-open row', () => {
    expect(settleOpen(140, TRAY, 0.9)).toBe(false)
  })

  it('stays closed when there is no tray to reveal', () => {
    expect(settleOpen(200, 0, -2)).toBe(false)
  })
})

describe('rubberBand', () => {
  it('passes through inside the tray', () => {
    expect(rubberBand(70, TRAY)).toBe(70)
  })

  it('damps a pull past either end', () => {
    expect(rubberBand(-100, TRAY)).toBeCloseTo(-35)
    expect(rubberBand(TRAY + 100, TRAY)).toBeCloseTo(TRAY + 35)
  })
})
