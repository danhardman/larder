/** The document everything else lives under: `/households/{id}` (spec §3). */

import type { Settings } from './settings'

export interface Household {
  id: string
  name: string
  /** Who may read and write under this household. The security rules read this
   *  field directly — it is the whole authorization model (spec §3, §7.1). */
  memberUids: string[]
  settings: Settings
}
