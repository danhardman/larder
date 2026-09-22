import { useAuth } from '../../state/auth'
import { missingConfig } from '../../state/firebase'

export function SignInScreen() {
  const { error, signInWithGoogle } = useAuth()

  return (
    <div className="flex h-dvh justify-center overflow-hidden bg-neutral-300">
      <div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-y-auto bg-bg px-6 shadow-[0_0_60px_rgba(46,43,37,0.18)]">
        <div className="flex flex-1 flex-col justify-center gap-7 py-10">
          <div>
            <p className="text-[12px] font-bold tracking-[0.14em] text-neutral-600 uppercase">
              Household meal planning
            </p>
            <h1 className="mt-2 font-heading text-[42px] leading-[1.05] text-text">Larder</h1>
            <p className="mt-3 text-[15px] leading-[1.5] text-neutral-700">
              Sign in with Google to reach your household’s meals, weeks and shopping list.
            </p>
          </div>

          {missingConfig.length > 0 && (
            <p className="rounded-md border border-accent-400 bg-accent-100 px-4 py-3 text-[13px] leading-[1.5] text-accent-800">
              Firebase config is incomplete — missing {missingConfig.join(', ')}. Vite inlines these
              at build time, so set them in the build environment and redeploy.
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
              <p className="mt-1 text-[12.5px] leading-[1.5] break-words text-neutral-700">
                {error.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 40.2 44 35 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  )
}
