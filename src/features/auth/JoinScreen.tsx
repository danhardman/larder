import type { Invite } from '../../types'
import { GateShell, SignedInAs } from './GateShell'

interface JoinScreenProps {
  invite: Invite
  joining: boolean
  error: string | null
  onJoin: () => void
}

export function JoinScreen({ invite, joining, error, onJoin }: JoinScreenProps) {
  return (
    <GateShell eyebrow="You’re invited" title={invite.householdName}>
      <p className="text-[15px] leading-[1.5] text-neutral-700">
        Someone in this household has invited you to share its meals, weeks and shopping list.
      </p>

      <button
        type="button"
        onClick={onJoin}
        disabled={joining}
        className="btn btn-primary w-full py-4 text-[16px] font-bold shadow-md"
      >
        {joining ? 'Joining…' : `Join ${invite.householdName}`}
      </button>

      {error && (
        <div className="rounded-md border border-divider bg-neutral-100 px-4 py-3">
          <p className="text-[13px] font-bold text-accent-800">Couldn’t join</p>
          <p className="mt-1 text-[12.5px] leading-[1.5] break-words text-neutral-700">{error}</p>
        </div>
      )}

      <SignedInAs />
    </GateShell>
  )
}
