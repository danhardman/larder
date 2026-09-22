/** Household-level knobs that feed the plan generator. */

export interface Settings {
  recencyWindowWeeks: number
  rotationSize: number
}

/** Settings for a household that has never changed them. */
export const DEFAULT_SETTINGS: Settings = { recencyWindowWeeks: 2, rotationSize: 2 }
