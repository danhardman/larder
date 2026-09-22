import type { ReactNode } from 'react'
import { ErrorScreen } from '../../components/ErrorScreen'
import { LoadingScreen } from '../../components/LoadingScreen'
import { useHousehold } from '../../state/household'
import { JoinScreen } from './JoinScreen'
import { NotInvitedScreen } from './NotInvitedScreen'

/** Gates the app behind household membership (spec §3, M2). Renders below the
 *  auth gate, so there is always a signed-in user by the time this runs. */
export function HouseholdGate({ children }: { children: ReactNode }) {
  const household = useHousehold()

  switch (household.status) {
    case 'resolving':
      return <LoadingScreen />
    case 'invited':
      return (
        <JoinScreen
          invite={household.invite}
          joining={household.joining}
          error={household.error}
          onJoin={household.join}
        />
      )
    case 'not-invited':
      return <NotInvitedScreen />
    case 'error':
      return <ErrorScreen message={household.message} />
    case 'member':
      return <>{children}</>
  }
}
