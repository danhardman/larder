import { GoogleMark } from '../../components/icons/GoogleMark'
import { useAuth } from '../../state/auth'
import { missingConfig } from '../../state/firebase'
import { GateShell } from './GateShell'

export function SignInScreen() {
  const { error, signInWithGoogle } = useAuth()

  return (
    <GateShell eyebrow="Household meal planning" title="Larder">
      <p className="-mt-4 text-[15px] leading-[1.5] text-neutral-700">
        Sign in with Google to reach your household’s meals, weeks and shopping list.
      </p>

      {missingConfig.length > 0 && (
        <p className="rounded-md border border-accent-400 bg-accent-100 px-4 py-3 text-[13px] leading-[1.5] text-accent-800">
          Firebase config is incomplete — missing {missingConfig.join(', ')}. Vite inlines these at build time, so set
          them in the build environment and redeploy.
        </p>
      )}

      <button
        type="button"
        onClick={signInWithGoogle}
        className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border-none bg-accent-600 px-5 py-4 text-[16px] font-bold text-neutral-100 shadow-md"
      >
        <GoogleMark />
        Sign in with Google
      </button>

      {error && (
        <div className="rounded-md border border-divider bg-neutral-100 px-4 py-3">
          <p className="text-[13px] font-bold text-accent-800">Sign-in failed — {error.code}</p>
          <p className="mt-1 text-[12.5px] leading-[1.5] break-words text-neutral-700">{error.message}</p>
        </div>
      )}
    </GateShell>
  )
}
