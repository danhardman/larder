/**
 * `useHousehold()`: which household the signed-in user belongs to, or why they
 * don't have one yet. Sits between the auth gate and the store (spec §3, §8 M2).
 *
 *   resolving ─▶ findHouseholdId ─▶ member
 *                └▶ subscribeInvite(email) ─▶ invited ──join()──▶ member
 *                                            └▶ createHousehold ─▶ member
 *                                                └▶ permission-denied ─▶ not-invited
 *
 * The invite listener stays live in `not-invited`, so the locked-out screen turns
 * into the join screen as soon as a member invites this address. Founding is
 * attempted exactly once per sign-in: the rules only allow it for a founder
 * (`/founders/{email}`), and everyone else lands on `not-invited`.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Invite } from '../types'
import { useAuth } from './auth'
import { createHousehold, findHouseholdId, joinHousehold, subscribeInvite, updateOwnProfile } from './db'

export type HouseholdState =
  | { status: 'resolving' }
  | { status: 'member'; hid: string }
  | { status: 'invited'; invite: Invite; joining: boolean; error: string | null }
  | { status: 'not-invited' }
  | { status: 'error'; message: string }

export type HouseholdValue = HouseholdState & {
  /** Accept the pending invite. Only meaningful in `invited`. */
  join: () => Promise<void>
}

const HouseholdContext = createContext<HouseholdValue | null>(null)

const describe = (err: unknown): string => {
  const e = err as { code?: string; message?: string }
  return e?.code ? `${e.code}: ${e.message ?? ''}` : String(err)
}

const isPermissionDenied = (err: unknown) => (err as { code?: string })?.code === 'permission-denied'

// One founding attempt per uid at a time: StrictMode runs effects twice in dev, and
// two concurrent attempts would otherwise each create a household.
const founding = new Map<string, Promise<string>>()

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [state, setState] = useState<HouseholdState>({ status: 'resolving' })
  // The latest state, readable from async callbacks without re-subscribing.
  const stateRef = useRef(state)
  stateRef.current = state
  // Set synchronously when a join starts, so the invite listener — which fires
  // with "no invite" the moment our own batch consumes it — knows not to react.
  const joiningRef = useRef(false)
  const stopInviteRef = useRef<(() => void) | undefined>(undefined)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    let triedFounding = false
    joiningRef.current = false
    setState({ status: 'resolving' })
    const stopInvite = () => {
      stopInviteRef.current?.()
      stopInviteRef.current = undefined
    }

    const settle = (next: HouseholdState) => {
      if (!cancelled) setState(next)
    }

    const found = async () => {
      if (triedFounding) return
      triedFounding = true
      let attempt = founding.get(user.uid)
      if (!attempt) {
        attempt = createHousehold(user).finally(() => founding.delete(user.uid))
        founding.set(user.uid, attempt)
      }
      try {
        const hid = await attempt
        stopInvite()
        settle({ status: 'member', hid })
      } catch (err) {
        if (isPermissionDenied(err)) settle({ status: 'not-invited' })
        else settle({ status: 'error', message: describe(err) })
      }
    }

    const resolve = async () => {
      try {
        const hid = await findHouseholdId(user.uid)
        if (cancelled) return
        if (hid) {
          settle({ status: 'member', hid })
          return
        }
        const email = user.email
        if (!email) {
          settle({ status: 'not-invited' })
          return
        }
        stopInviteRef.current = subscribeInvite(
          email,
          (invite) => {
            if (cancelled || joiningRef.current) return
            if (invite) settle({ status: 'invited', invite, joining: false, error: null })
            else void found()
          },
          (err) => {
            // The rules only let a *verified* email read its invite. Google accounts
            // always are; anything else can't be invited, so it's locked out rather
            // than broken.
            if (isPermissionDenied(err)) settle({ status: 'not-invited' })
            else settle({ status: 'error', message: describe(err) })
          },
        )
      } catch (err) {
        settle({ status: 'error', message: describe(err) })
      }
    }

    void resolve()

    return () => {
      cancelled = true
      stopInvite()
    }
  }, [user])

  // Keep our own members entry in step with the Google profile. Fire-and-forget;
  // a failure here is cosmetic.
  const memberHid = state.status === 'member' ? state.hid : null
  useEffect(() => {
    if (!user || !memberHid) return
    updateOwnProfile(memberHid, user).catch(() => {})
  }, [user, memberHid])

  const join = useCallback(async () => {
    const current = stateRef.current
    if (!user || current.status !== 'invited' || joiningRef.current) return
    joiningRef.current = true
    setState({ ...current, joining: true, error: null })
    try {
      await joinHousehold(current.invite, user)
      stopInviteRef.current?.()
      stopInviteRef.current = undefined
      setState({ status: 'member', hid: current.invite.householdId })
    } catch (err) {
      joiningRef.current = false
      setState({ ...current, joining: false, error: describe(err) })
    }
  }, [user])

  const value = useMemo<HouseholdValue>(() => ({ ...state, join }), [state, join])

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>
}

export function useHousehold(): HouseholdValue {
  const value = useContext(HouseholdContext)
  if (!value) throw new Error('useHousehold must be used inside <HouseholdProvider>')
  return value
}

/** The household id, for code that only renders behind `HouseholdGate`. */
export function useMemberHouseholdId(): string {
  const value = useHousehold()
  if (value.status !== 'member') throw new Error('useMemberHouseholdId used outside a member household')
  return value.hid
}
