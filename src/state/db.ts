/**
 * The Firestore-shaped half of the store: where documents live, how a snapshot
 * becomes a domain object, and how a signed-in user finds, founds or joins their
 * household. Plain functions, no React — `store.tsx` and `household.tsx` wire them
 * to subscriptions and actions.
 *
 * Layout (spec §3):
 *   /households/{hid}              name, memberUids[], members{}, settings
 *     /meals/{mealId}              doc id = meal.id
 *     /weekPlans/{weekStart}       doc id = the ISO Monday, so one plan per week is
 *                                  structural and two devices drafting offline converge
 *     /ingredients/{ingredientId}  { name, nameLower } — the autocomplete catalog; a
 *                                  meal's ingredients carry the id plus a copy of the name
 *   /invites/{email}               a pending invitation, keyed by lower-cased email
 *   /founders/{email}              who may found a household (beta gate); never read
 *                                  by the client, only by the rules
 */

import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  FieldPath,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
  type FirestoreError,
  type WriteBatch,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import {
  DEFAULT_SETTINGS,
  type Household,
  type Ingredient,
  type Invite,
  type Meal,
  type MemberProfile,
  type Settings,
  type WeekPlan,
} from '../types'
import { db } from './firebase'

export const householdsCol = () => collection(db, 'households')
export const householdRef = (hid: string) => doc(db, 'households', hid)
export const mealsCol = (hid: string) => collection(householdRef(hid), 'meals')
export const mealRef = (hid: string, mealId: string) => doc(mealsCol(hid), mealId)
export const weekPlansCol = (hid: string) => collection(householdRef(hid), 'weekPlans')
export const weekPlanRef = (hid: string, weekStart: string) => doc(weekPlansCol(hid), weekStart)
export const ingredientsCol = (hid: string) => collection(householdRef(hid), 'ingredients')
export const ingredientRef = (hid: string, ingredientId: string) => doc(ingredientsCol(hid), ingredientId)
export const invitesCol = () => collection(db, 'invites')
export const inviteRef = (email: string) => doc(invitesCol(), normaliseEmail(email))

/** Invites and founders are keyed by this form of the address; the rules lower-case
 *  the token email the same way. */
export const normaliseEmail = (email: string) => email.trim().toLowerCase()

/** What a member publishes about themselves for the members list. */
export function memberProfile(user: Pick<User, 'displayName' | 'email'>): MemberProfile {
  const email = user.email ?? ''
  return { name: user.displayName || email, email }
}

/*
 * Mappers fill defaults for fields a document may lack — written by an older build,
 * or by a hand edit in the Emulator UI — so a missing field degrades to "empty"
 * rather than a crash somewhere in a screen. They take plain data, not snapshots,
 * so they are testable without Firebase.
 */

export function toSettings(data: DocumentData | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...(data ?? {}) }
}

export function toHousehold(id: string, data: DocumentData): Household {
  return {
    id,
    name: data.name ?? 'Our larder',
    memberUids: data.memberUids ?? [],
    members: data.members ?? {},
    settings: toSettings(data.settings),
  }
}

export function toInvite(id: string, data: DocumentData): Invite {
  return {
    email: data.email ?? id,
    householdId: data.householdId ?? '',
    householdName: data.householdName ?? 'Our larder',
    invitedBy: data.invitedBy ?? '',
  }
}

export function toMeal(id: string, data: DocumentData): Meal {
  return {
    id,
    name: data.name ?? '',
    mealTypes: data.mealTypes ?? [],
    protein: data.protein ?? 'other',
    carbBase: data.carbBase ?? 'none',
    seasons: data.seasons ?? [],
    ingredients: data.ingredients ?? [],
    effort: data.effort,
    archived: data.archived ?? false,
  }
}

export function toIngredient(id: string, data: DocumentData): Ingredient {
  const name: string = data.name ?? ''
  return { id, name, nameLower: data.nameLower ?? name.toLowerCase() }
}

export function toPlan(id: string, data: DocumentData): WeekPlan {
  return {
    id: data.id ?? id,
    weekStart: data.weekStart ?? id,
    slots: data.slots ?? [],
    status: data.status ?? 'draft',
    seed: data.seed ?? 0,
    thin: data.thin ?? [],
    generatedBy: data.generatedBy ?? 'client',
    ticked: data.ticked ?? {},
  }
}

/*
 * The ingredient catalog (spec §3). Subscribed lazily — only while the meal editor is
 * open — so it never delays first render; see `state/ingredients.ts`.
 */

export function subscribeIngredients(
  hid: string,
  onChange: (ingredients: Ingredient[]) => void,
  onError: (err: FirestoreError) => void,
) {
  return onSnapshot(
    ingredientsCol(hid),
    (snap) => onChange(snap.docs.map((d) => toIngredient(d.id, d.data()))),
    onError,
  )
}

/** The catalog doc's exact shape — the rules reject anything else. */
const ingredientDoc = (name: string) => ({ name, nameLower: name.toLowerCase() })

/**
 * Save a meal together with any catalog entries it introduces, atomically. The
 * editor resolves names against the in-memory catalog first (`resolveIngredients`),
 * so `created` only holds names the household hasn't used before. Two devices
 * inventing the same name offline can still both create it — the rules can't
 * enforce uniqueness across random ids — which is accepted at household scale.
 */
export function commitMeal(hid: string, meal: Meal, created: Ingredient[]): Promise<void> {
  const batch = writeBatch(db)
  for (const ingredient of created) batch.set(ingredientRef(hid, ingredient.id), ingredientDoc(ingredient.name))
  batch.set(mealRef(hid, meal.id), meal)
  return batch.commit()
}

/**
 * Rename a catalog entry and fan the new name out to every meal that uses it
 * (spec §3 accepts this cost at household scale). `meals` is the store's live list,
 * so no read is needed. Batches cap at 500 writes; a household library will never
 * get there, but chunking costs nothing.
 */
export async function renameIngredient(hid: string, ingredientId: string, name: string, meals: Meal[]): Promise<void> {
  const uses = (i: { ingredientId: string }) => i.ingredientId === ingredientId
  const affected = meals.filter((meal) => meal.ingredients.some(uses))
  const writes: Array<(batch: WriteBatch) => void> = [
    (batch) => batch.update(ingredientRef(hid, ingredientId), ingredientDoc(name)),
    ...affected.map((meal) => (batch: WriteBatch) => {
      const ingredients = meal.ingredients.map((i) => (uses(i) ? { ...i, name } : i))
      batch.update(mealRef(hid, meal.id), { ingredients })
    }),
  ]
  for (let start = 0; start < writes.length; start += 500) {
    const batch = writeBatch(db)
    for (const write of writes.slice(start, start + 500)) write(batch)
    await batch.commit()
  }
}

/*
 * Membership. The rules decide all of this (see `firestore.rules`); these helpers
 * just issue the exact writes the rules accept.
 */

/** The household this user belongs to, or null. The query is exactly the shape the
 *  `list` rule permits: `memberUids` contains the caller. */
export async function findHouseholdId(uid: string): Promise<string | null> {
  const found = await getDocs(query(householdsCol(), where('memberUids', 'array-contains', uid), limit(1)))
  return found.empty ? null : found.docs[0].id
}

/** Found a household of one. Only succeeds for a founder (`/founders/{email}`). */
export async function createHousehold(user: User): Promise<string> {
  const created = await addDoc(householdsCol(), {
    name: 'Our larder',
    memberUids: [user.uid],
    members: { [user.uid]: memberProfile(user) },
    settings: DEFAULT_SETTINGS,
    createdAt: serverTimestamp(),
  })
  return created.id
}

/**
 * Accept an invite: append ourselves to the household and consume the invite, in
 * one batch. We can't read the household first (not a member yet), so the update
 * is written blind with `arrayUnion` — which appends, matching the rule's
 * `concat([uid])` check. Awaited, unlike the store's writes: this is a one-off
 * action whose result the screen has to show.
 */
export async function joinHousehold(invite: Invite, user: User): Promise<void> {
  const batch = writeBatch(db)
  batch.update(
    householdRef(invite.householdId),
    'memberUids',
    arrayUnion(user.uid),
    new FieldPath('members', user.uid),
    memberProfile(user),
  )
  batch.delete(inviteRef(invite.email))
  await batch.commit()
}

/** A live view of the invite addressed to this email, if any. A listener rather
 *  than a one-shot read: the locked-out screen flips to "join" the moment a member
 *  invites this address, and the persistent cache can't serve a stale miss. */
export function subscribeInvite(
  email: string,
  onChange: (invite: Invite | null) => void,
  onError: (err: FirestoreError) => void,
) {
  return onSnapshot(
    inviteRef(email),
    (snap) => onChange(snap.exists() ? toInvite(snap.id, snap.data()) : null),
    onError,
  )
}

/** The pending invites for a household — the query shape the `list` rule permits. */
export function subscribeInvites(
  hid: string,
  onChange: (invites: Invite[]) => void,
  onError: (err: FirestoreError) => void,
) {
  return onSnapshot(
    query(invitesCol(), where('householdId', '==', hid)),
    (snap) => onChange(snap.docs.map((d) => toInvite(d.id, d.data()))),
    onError,
  )
}

export function createInvite(hid: string, householdName: string, email: string, invitedBy: string): Promise<void> {
  const normalised = normaliseEmail(email)
  return setDoc(inviteRef(normalised), {
    email: normalised,
    householdId: hid,
    householdName,
    invitedBy,
    createdAt: serverTimestamp(),
  })
}

export function deleteInvite(email: string): Promise<void> {
  return deleteDoc(inviteRef(email))
}

/** Keep our own entry in the members list current with the Google profile. */
export function updateOwnProfile(hid: string, user: User): Promise<void> {
  const batch = writeBatch(db)
  batch.update(householdRef(hid), new FieldPath('members', user.uid), memberProfile(user))
  return batch.commit()
}
