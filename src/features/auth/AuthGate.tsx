import { SignInScreen } from './SignInScreen'
import { LoadingScreen } from '../../components/LoadingScreen'
import { useAuth } from '../../state/auth'
import type { ReactNode } from 'react'

/** Gates the whole app behind a signed-in Google account (spec §7.3, M0).
 *  Household membership is `HouseholdGate`, one layer down. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'loading') return <LoadingScreen />

  if (status === 'signed-out') return <SignInScreen />

  return <>{children}</>
}
