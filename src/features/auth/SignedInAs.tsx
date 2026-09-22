import { useAuth } from '../../state/auth'

/** "Signed in as … · Sign out" — for the screens where the wrong account is the
 *  likeliest reason you're seeing them. */
export function SignedInAs() {
  const { user, signOutOfLarder } = useAuth()
  return (
    <p className="text-[13px] leading-[1.5] text-neutral-600">
      Signed in as <span className="font-bold text-neutral-800">{user?.email}</span>.{' '}
      <button type="button" onClick={signOutOfLarder} className="btn btn-ghost inline px-0 text-[13px]">
        Not you? Sign out
      </button>
    </p>
  )
}
