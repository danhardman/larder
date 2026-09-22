/** The document everything else lives under: `/households/{id}` (spec §3). */

import type { Settings } from './settings'

/** A member's display profile, written by that member only. */
export interface MemberProfile {
  name: string
  email: string
}

export interface Household {
  id: string
  name: string
  /** Who may read and write under this household. The security rules read this
   *  field directly — it is the whole authorization model (spec §3, §7.1). */
  memberUids: string[]
  /** Keyed by uid. Display only; `memberUids` is what the rules trust. */
  members: Record<string, MemberProfile>
  settings: Settings
}

/**
 * A pending invitation, `/invites/{email}`: one per address, keyed by the
 * lower-cased email so the invited Google account can find it from its own token.
 */
export interface Invite {
  email: string
  householdId: string
  householdName: string
  invitedBy: string
}
