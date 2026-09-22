import { useCallback, useEffect, useState } from 'react'
import { createInvite, deleteInvite, normaliseEmail, subscribeInvites } from '../../state/db'
import { useAuth } from '../../state/auth'
import { useLarder } from '../../state/store'
import { useToast } from '../../state/toast'
import type { Invite } from '../../types'

const looksLikeEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const describe = (err: unknown): string => {
  const e = err as { code?: string; message?: string }
  return e?.code ? `${e.code}: ${e.message ?? ''}` : String(err)
}

/**
 * The household's pending invites and the two things you can do to them. Only the
 * settings screen needs this, so it lives here rather than delaying the store's
 * `ready`; it still only talks to `db.ts`, never Firestore (spec §7.4).
 */
export function useInvites() {
  const { household } = useLarder()
  const { user } = useAuth()
  const { say } = useToast()
  const [invites, setInvites] = useState<Invite[]>([])

  useEffect(
    () => subscribeInvites(household.id, setInvites, (err) => say(`Couldn’t load invites — ${describe(err)}`)),
    [household.id, say],
  )

  /** Returns an error message to show inline, or null when the invite was issued. */
  const inviteMember = useCallback(
    (raw: string): string | null => {
      if (!user) return 'Not signed in.'
      const email = normaliseEmail(raw)
      if (!looksLikeEmail(email)) return 'That doesn’t look like an email address.'
      if (email === normaliseEmail(user.email ?? '')) return 'That’s you.'
      const already = Object.values(household.members).some((m) => normaliseEmail(m.email) === email)
      if (already) return 'They’re already a member.'
      if (invites.some((i) => i.email === email)) return 'Already invited.'
      createInvite(household.id, household.name, email, user.uid).catch((err) => {
        const denied = (err as { code?: string })?.code === 'permission-denied'
        say(denied ? `${email} already has a pending invite elsewhere.` : `Couldn’t invite — ${describe(err)}`)
      })
      say(`Invited ${email}`)
      return null
    },
    [user, household, invites, say],
  )

  const revokeInvite = useCallback(
    (email: string) => {
      deleteInvite(email).catch((err) => say(`Couldn’t revoke — ${describe(err)}`))
      say(`Revoked ${email}`)
    },
    [say],
  )

  return { invites, inviteMember, revokeInvite }
}
