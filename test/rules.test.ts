/**
 * Firestore security rules, exercised against the emulator. Needs `pnpm emulators`
 * running; run with `pnpm test:rules`.
 *
 * The rules are the entire authorization layer (spec §7.1), so every case here
 * is a claim the app relies on: members get in, everyone else is locked out.
 */

import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, limit, query, setDoc, updateDoc, where } from 'firebase/firestore'

const ALICE = 'alice'
const BOB = 'bob'
const HID = 'household-a'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'larder-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  // Alice's household, written with rules bypassed.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'households', HID), {
      name: 'Test larder',
      memberUids: [ALICE],
      settings: { recencyWindowWeeks: 2, rotationSize: 2 },
    })
    await setDoc(doc(db, 'households', HID, 'meals', 'm1'), { name: 'Toast', archived: false })
  })
})

const as = (uid: string | null) =>
  uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore()

describe('household document', () => {
  it('a member can read it, and find it by membership query', async () => {
    const db = as(ALICE)
    await assertSucceeds(getDoc(doc(db, 'households', HID)))
    await assertSucceeds(
      getDocs(query(collection(db, 'households'), where('memberUids', 'array-contains', ALICE), limit(1))),
    )
  })

  it('a non-member cannot read it, even by query', async () => {
    const db = as(BOB)
    await assertFails(getDoc(doc(db, 'households', HID)))
    // Querying for Alice's memberships isn't a query Bob is allowed to make.
    await assertFails(
      getDocs(query(collection(db, 'households'), where('memberUids', 'array-contains', ALICE), limit(1))),
    )
    // Bob's own membership query is fine — it just returns nothing.
    await assertSucceeds(
      getDocs(query(collection(db, 'households'), where('memberUids', 'array-contains', BOB), limit(1))),
    )
  })

  it('an unauthenticated user cannot read anything', async () => {
    const db = as(null)
    await assertFails(getDoc(doc(db, 'households', HID)))
    await assertFails(getDocs(collection(db, 'households')))
  })

  it('anyone signed in can found a household of exactly themselves', async () => {
    const db = as(BOB)
    await assertSucceeds(setDoc(doc(db, 'households', 'bobs'), { name: 'Bob', memberUids: [BOB], settings: {} }))
    await assertFails(setDoc(doc(db, 'households', 'sneaky'), { name: 'x', memberUids: [BOB, ALICE], settings: {} }))
    await assertFails(setDoc(doc(db, 'households', 'sneakier'), { name: 'x', memberUids: [ALICE], settings: {} }))
    await assertFails(setDoc(doc(db, 'households', 'empty'), { name: 'x', memberUids: [], settings: {} }))
  })

  it('a member can update settings but not remove themselves', async () => {
    const db = as(ALICE)
    await assertSucceeds(updateDoc(doc(db, 'households', HID), { settings: { recencyWindowWeeks: 3, rotationSize: 1 } }))
    await assertFails(updateDoc(doc(db, 'households', HID), { memberUids: [] }))
    await assertFails(updateDoc(doc(db, 'households', HID), { memberUids: [BOB] }))
  })

  it('a non-member cannot update or delete it', async () => {
    await assertFails(updateDoc(doc(as(BOB), 'households', HID), { name: 'Mine now' }))
    await assertFails(deleteDoc(doc(as(ALICE), 'households', HID)))
  })
})

describe('household subcollections', () => {
  it('a member can read and write meals and weekPlans', async () => {
    const db = as(ALICE)
    await assertSucceeds(getDocs(collection(db, 'households', HID, 'meals')))
    await assertSucceeds(setDoc(doc(db, 'households', HID, 'meals', 'm2'), { name: 'Soup', archived: false }))
    await assertSucceeds(updateDoc(doc(db, 'households', HID, 'meals', 'm1'), { archived: true }))
    await assertSucceeds(deleteDoc(doc(db, 'households', HID, 'meals', 'm1')))
    await assertSucceeds(
      setDoc(doc(db, 'households', HID, 'weekPlans', '2026-09-21'), { weekStart: '2026-09-21', status: 'draft' }),
    )
    await assertSucceeds(getDocs(collection(db, 'households', HID, 'weekPlans')))
  })

  it('a non-member cannot touch them', async () => {
    const db = as(BOB)
    await assertFails(getDocs(collection(db, 'households', HID, 'meals')))
    await assertFails(getDoc(doc(db, 'households', HID, 'meals', 'm1')))
    await assertFails(setDoc(doc(db, 'households', HID, 'meals', 'm9'), { name: 'Intruder' }))
    await assertFails(setDoc(doc(db, 'households', HID, 'weekPlans', '2026-09-21'), { status: 'draft' }))
  })

  it('an unauthenticated user cannot touch them', async () => {
    const db = as(null)
    await assertFails(getDocs(collection(db, 'households', HID, 'meals')))
    await assertFails(setDoc(doc(db, 'households', HID, 'meals', 'm9'), { name: 'Intruder' }))
  })
})

describe('everything else', () => {
  it('top-level collections outside households are closed', async () => {
    const db = as(ALICE)
    await assertFails(setDoc(doc(db, 'users', ALICE), { hello: true }))
    await assertFails(getDocs(collection(db, 'users')))
  })
})
