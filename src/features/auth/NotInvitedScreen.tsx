import { useAuth } from '../../state/auth'
import { GateShell, SignedInAs } from './GateShell'

/** Signed in, but not a member of anything, not invited, and not a founder. The
 *  invite listener behind this screen is live: an invite turns it into the join
 *  screen without a reload. */
export function NotInvitedScreen() {
  const { user } = useAuth()
  return (
    <GateShell eyebrow="Invite only" title="Larder">
      <p className="text-[15px] leading-[1.5] text-neutral-700">
        Larder is invite-only for now. Ask someone in the household to invite{' '}
        <span className="font-bold text-neutral-800">{user?.email ?? 'this account'}</span> — this screen
        will update by itself once they have.
      </p>
      <SignedInAs />
    </GateShell>
  )
}
