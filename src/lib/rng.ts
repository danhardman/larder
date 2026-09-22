/**
 * Seeded randomness for the planner. A plan stores its seed, so a baffling
 * week can be regenerated exactly and reasoned about.
 */

/** A generator returning a float in [0, 1), like `Math.random`. */
export type Rng = () => number

/** mulberry32 — small, fast, and deterministic for a given seed. */
export function rngFrom(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A shuffled copy (Fisher–Yates) drawn from `rng`; the input is left alone. */
export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** A fresh seed for a new draft. The only place the planner touches `Math.random`. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 1e9)
}
