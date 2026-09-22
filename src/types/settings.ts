/** Household-level knobs that feed the plan generator. */

export interface Settings {
  recencyWindowWeeks: number
  rotationSize: number
}

/** Settings for a household that has never changed them. */
export const DEFAULT_SETTINGS: Settings = { recencyWindowWeeks: 2, rotationSize: 2 }

/** Breakfast/lunch options repeated across a week (spec §4: "1–3"). */
export const ROTATION_SIZES = [1, 2, 3] as const

/** Accepted weeks whose dinners are penalised; 0 turns the penalty off. */
export const RECENCY_WINDOWS = [0, 1, 2, 3, 4] as const
