import { useState, type FormEvent } from 'react'
import { CloseIcon } from '../../components/icons'
import type { Household, Invite } from '../../types'

interface SettingsScreenProps {
  household: Household
  invites: Invite[]
  currentUid: string
  accountName: string
  accountEmail: string
  /** Issue an invite; returns a message to show inline, or null on success. */
  onInvite: (email: string) => string | null
  onRevoke: (email: string) => void
  onSignOut: () => void
}

/**
 * Household members, pending invites, and the account. The recency-window and
 * rotation-size controls (spec §6) arrive in Stage 5 and go above the members
 * section.
 */
export function SettingsScreen({
  household,
  invites,
  currentUid,
  accountName,
  accountEmail,
  onInvite,
  onRevoke,
  onSignOut,
}: SettingsScreenProps) {
  const [email, setEmail] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  // memberUids is the truth; members is display data that may lag behind it.
  const members = household.memberUids.map((uid) => ({
    uid,
    name: household.members[uid]?.name ?? 'Member',
    email: household.members[uid]?.email ?? '',
  }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const result = onInvite(email)
    setProblem(result)
    if (!result) setEmail('')
  }

  return (
    <div>
      <div className="px-5 pt-[26px]">
        <div className="font-heading text-[30px] leading-none">Settings</div>
        <div className="mt-[7px] text-[13px] font-medium text-neutral-600">{household.name}</div>
      </div>

      <Section title="Members">
        <ul className="flex flex-col divide-y divide-divider">
          {members.map((m) => (
            <li key={m.uid} className="flex items-center gap-3 py-[10px]">
              <Avatar name={m.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-bold text-text">
                  {m.name}
                  {m.uid === currentUid && <span className="ml-2 text-[12px] font-medium text-neutral-600">you</span>}
                </p>
                {m.email && <p className="truncate text-[12.5px] text-neutral-600">{m.email}</p>}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Invite someone" hint="They sign in with this Google account and get a Join button.">
        <form onSubmit={submit} className="flex gap-2">
          <input
            className="input"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="their@gmail.com"
            aria-label="Email address to invite"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setProblem(null)
            }}
          />
          <button type="submit" className="btn btn-primary shrink-0 font-bold" disabled={!email.trim()}>
            Invite
          </button>
        </form>
        {problem && <p className="mt-2 text-[12.5px] font-medium text-accent-800">{problem}</p>}

        {invites.length > 0 && (
          <ul className="mt-3 flex flex-col divide-y divide-divider">
            {invites.map((invite) => (
              <li key={invite.email} className="flex items-center gap-3 py-[10px]">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-text">{invite.email}</p>
                  <p className="text-[12.5px] text-neutral-600">Waiting for them to sign in</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRevoke(invite.email)}
                  aria-label={`Revoke invite for ${invite.email}`}
                  className="btn btn-secondary gap-1 px-3 py-[6px] text-[12.5px]"
                >
                  <CloseIcon size={14} />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Account">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14.5px] font-bold text-text">{accountName}</p>
            {accountEmail && accountEmail !== accountName && (
              <p className="truncate text-[12.5px] text-neutral-600">{accountEmail}</p>
            )}
          </div>
          <button type="button" onClick={onSignOut} className="btn btn-secondary font-bold">
            Sign out
          </button>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="px-5 pt-6">
      <h2 className="text-[12px] font-bold tracking-[0.12em] text-neutral-600 uppercase">{title}</h2>
      {hint && <p className="mt-1 text-[12.5px] leading-[1.5] text-neutral-600">{hint}</p>}
      <div className="mt-3 rounded-md border border-divider bg-neutral-100 px-4 py-2">{children}</div>
    </section>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-200 text-[13px] font-bold text-accent-800">
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}
