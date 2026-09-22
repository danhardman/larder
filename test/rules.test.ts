/**
 * Firestore security rules, exercised against the emulator. Needs `pnpm emulators`
 * running; run with `pnpm test:rules`.
 *
 * The rules are the entire authorization layer (spec §7.1), so every case here
 * is a claim the app relies on: members get in, invitees can join, founders can
 * found, and everyone else is locked out.
 */

import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  FieldPath,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

const ALICE = 'alice'
const ALICE_EMAIL = 'alice@example.com'
const BOB = 'bob'
const BOB_EMAIL = 'bob@example.com'
const CAROL = 'carol'
const CAROL_EMAIL = 'carol@example.com'
const HID = 'household-a'
const OTHER_HID = 'household-z'

const profile = (name: string, email: string) => ({ name, email })

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
  // Alice founded a household; Bob and Carol have nothing. Written with rules bypassed.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'founders', ALICE_EMAIL), {})
    await setDoc(doc(db, 'households', HID), {
      name: 'Test larder',
      memberUids: [ALICE],
      members: { [ALICE]: profile('Alice', ALICE_EMAIL) },
      settings: { recencyWindowWeeks: 2, rotationSize: 2 },
    })
    await setDoc(doc(db, 'households', HID, 'meals', 'm1'), { name: 'Toast', archived: false })
    await setDoc(doc(db, 'households', OTHER_HID), {
      name: 'Someone else',
      memberUids: ['zed'],
      settings: {},
    })
  })
})

const as = (uid: string | null, email?: string, verified = true) =>
  uid
    ? env.authenticatedContext(uid, email ? { email, email_verified: verified } : {}).firestore()
    : env.unauthenticatedContext().firestore()

const alice = () => as(ALICE, ALICE_EMAIL)
const bob = () => as(BOB, BOB_EMAIL)
const carol = () => as(CAROL, CAROL_EMAIL)

const inviteFor = (email: string, hid = HID, invitedBy = ALICE) => ({
  email,
  householdId: hid,
  householdName: 'Test larder',
  invitedBy,
  createdAt: serverTimestamp(),
})

const seedInvite = (email: string, hid = HID) =>
  env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'invites', email), {
      email,
      householdId: hid,
      householdName: 'Test larder',
      invitedBy: ALICE,
      createdAt: new Date(),
    })
  })

describe('household document', () => {
  it('a member can read it, and find it by membership query', async () => {
    const db = alice()
    await assertSucceeds(getDoc(doc(db, 'households', HID)))
    await assertSucceeds(
      getDocs(query(collection(db, 'households'), where('memberUids', 'array-contains', ALICE), limit(1))),
    )
  })

  it('a non-member cannot read it, even by query', async () => {
    const db = bob()
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

  it('a non-member cannot update or delete it', async () => {
    await assertFails(updateDoc(doc(bob(), 'households', HID), { name: 'Mine now' }))
    await assertFails(deleteDoc(doc(alice(), 'households', HID)))
  })
})

describe('founding a household', () => {
  const valid = (uid: string, email: string) => ({
    name: 'New',
    memberUids: [uid],
    members: { [uid]: profile('Someone', email) },
    settings: {},
  })

  it('a founder can found a household of exactly themselves', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'households', 'second'), valid(ALICE, ALICE_EMAIL)))
  })

  it('the founder lookup is case-insensitive on the token email', async () => {
    const db = as(ALICE, 'Alice@Example.com')
    await assertSucceeds(setDoc(doc(db, 'households', 'second'), valid(ALICE, ALICE_EMAIL)))
  })

  it('nobody else can, with the identical shape', async () => {
    await assertFails(setDoc(doc(bob(), 'households', 'bobs'), valid(BOB, BOB_EMAIL)))
    await assertFails(setDoc(doc(as(BOB), 'households', 'bobs'), valid(BOB, BOB_EMAIL)))
    await assertFails(setDoc(doc(as(null), 'households', 'anon'), valid(BOB, BOB_EMAIL)))
  })

  it('a founder cannot smuggle other members or a bad profile in', async () => {
    const db = alice()
    await assertFails(setDoc(doc(db, 'households', 'x1'), { ...valid(ALICE, ALICE_EMAIL), memberUids: [ALICE, BOB] }))
    await assertFails(setDoc(doc(db, 'households', 'x2'), { ...valid(ALICE, ALICE_EMAIL), memberUids: [BOB] }))
    await assertFails(setDoc(doc(db, 'households', 'x3'), { ...valid(ALICE, ALICE_EMAIL), memberUids: [] }))
    await assertFails(
      setDoc(doc(db, 'households', 'x4'), {
        ...valid(ALICE, ALICE_EMAIL),
        members: { [ALICE]: profile('A', ALICE_EMAIL), [BOB]: profile('B', BOB_EMAIL) },
      }),
    )
    await assertFails(setDoc(doc(db, 'households', 'x5'), { ...valid(ALICE, ALICE_EMAIL), members: {} }))
    await assertFails(setDoc(doc(db, 'households', 'x6'), { name: 'x', memberUids: [ALICE], settings: {} }))
    await assertFails(
      setDoc(doc(db, 'households', 'x7'), { ...valid(ALICE, ALICE_EMAIL), members: { [ALICE]: { name: 'A', admin: true } } }),
    )
  })
})

describe('member edits', () => {
  it('a member can change the name, settings and their own profile', async () => {
    const db = alice()
    await assertSucceeds(updateDoc(doc(db, 'households', HID), { settings: { recencyWindowWeeks: 3, rotationSize: 1 } }))
    await assertSucceeds(updateDoc(doc(db, 'households', HID), { name: 'Renamed' }))
    await assertSucceeds(
      updateDoc(doc(db, 'households', HID), new FieldPath('members', ALICE), profile('Alice H', ALICE_EMAIL)),
    )
  })

  it('a member can add their own profile to a Stage 2 household with no members map', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households', 'old'), { name: 'Old', memberUids: [ALICE], settings: {} })
    })
    const db = alice()
    await assertSucceeds(updateDoc(doc(db, 'households', 'old'), { settings: { rotationSize: 1 } }))
    await assertSucceeds(updateDoc(doc(db, 'households', 'old'), new FieldPath('members', ALICE), profile('Alice', ALICE_EMAIL)))
  })

  it("a member cannot touch memberUids, another's profile, or unknown fields", async () => {
    const db = alice()
    await assertFails(updateDoc(doc(db, 'households', HID), { memberUids: [] }))
    await assertFails(updateDoc(doc(db, 'households', HID), { memberUids: [BOB] }))
    await assertFails(updateDoc(doc(db, 'households', HID), { memberUids: arrayUnion(BOB) }))
    await assertFails(updateDoc(doc(db, 'households', HID), new FieldPath('members', BOB), profile('Bob', BOB_EMAIL)))
    await assertFails(updateDoc(doc(db, 'households', HID), { owner: ALICE }))
  })
})

describe('invites', () => {
  it('a member can invite an address to their household', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'invites', BOB_EMAIL), inviteFor(BOB_EMAIL)))
  })

  it('the invite must be well-formed', async () => {
    const db = alice()
    // id must be the lower-cased email
    await assertFails(setDoc(doc(db, 'invites', 'Bob@Example.com'), inviteFor('Bob@Example.com')))
    await assertFails(setDoc(doc(db, 'invites', BOB_EMAIL), inviteFor(CAROL_EMAIL)))
    // a household Alice is not in
    await assertFails(setDoc(doc(db, 'invites', BOB_EMAIL), inviteFor(BOB_EMAIL, OTHER_HID)))
    // invitedBy must be the caller
    await assertFails(setDoc(doc(db, 'invites', BOB_EMAIL), inviteFor(BOB_EMAIL, HID, BOB)))
    // createdAt must be the server time
    await assertFails(setDoc(doc(db, 'invites', BOB_EMAIL), { ...inviteFor(BOB_EMAIL), createdAt: new Date() }))
    // no missing or extra fields
    const { householdName: _, ...missing } = inviteFor(BOB_EMAIL)
    await assertFails(setDoc(doc(db, 'invites', BOB_EMAIL), missing))
    await assertFails(setDoc(doc(db, 'invites', BOB_EMAIL), { ...inviteFor(BOB_EMAIL), role: 'admin' }))
  })

  it('a non-member cannot invite anyone to a household', async () => {
    await assertFails(setDoc(doc(bob(), 'invites', CAROL_EMAIL), inviteFor(CAROL_EMAIL, HID, BOB)))
  })

  it('only the invitee can read their invite directly', async () => {
    await seedInvite(BOB_EMAIL)
    await assertSucceeds(getDoc(doc(bob(), 'invites', BOB_EMAIL)))
    await assertSucceeds(getDoc(doc(as(BOB, 'Bob@Example.com'), 'invites', BOB_EMAIL)))
    await assertFails(getDoc(doc(carol(), 'invites', BOB_EMAIL)))
    await assertFails(getDoc(doc(as(BOB, BOB_EMAIL, false), 'invites', BOB_EMAIL)))
    await assertFails(getDoc(doc(as(BOB), 'invites', BOB_EMAIL)))
    await assertFails(getDoc(doc(as(null), 'invites', BOB_EMAIL)))
  })

  it("members can list their household's invites, and nobody can list more", async () => {
    await seedInvite(BOB_EMAIL)
    const byHousehold = (db: ReturnType<typeof alice>, hid: string) =>
      getDocs(query(collection(db, 'invites'), where('householdId', '==', hid)))
    await assertSucceeds(byHousehold(alice(), HID))
    await assertFails(byHousehold(bob(), HID))
    await assertFails(byHousehold(alice(), OTHER_HID))
    await assertFails(getDocs(collection(alice(), 'invites')))
    await assertFails(getDocs(collection(bob(), 'invites')))
  })

  it('an invite can never be updated in place', async () => {
    await seedInvite(BOB_EMAIL)
    await assertFails(updateDoc(doc(alice(), 'invites', BOB_EMAIL), { householdName: 'x' }))
    await assertFails(updateDoc(doc(bob(), 'invites', BOB_EMAIL), { householdId: OTHER_HID }))
    // and not overwritten by a member of another household either
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'households', OTHER_HID), { memberUids: ['zed', CAROL] })
    })
    await assertFails(setDoc(doc(carol(), 'invites', BOB_EMAIL), inviteFor(BOB_EMAIL, OTHER_HID, CAROL)))
  })

  it('a member or the invitee can revoke it; nobody else', async () => {
    await seedInvite(BOB_EMAIL)
    await assertFails(deleteDoc(doc(carol(), 'invites', BOB_EMAIL)))
    await assertFails(deleteDoc(doc(as(null), 'invites', BOB_EMAIL)))
    await assertSucceeds(deleteDoc(doc(alice(), 'invites', BOB_EMAIL)))
    await seedInvite(BOB_EMAIL)
    await assertSucceeds(deleteDoc(doc(bob(), 'invites', BOB_EMAIL)))
  })
})

describe('joining', () => {
  /** The client's join: append self, add own profile, consume the invite — one batch. */
  const join = (db: ReturnType<typeof bob>, uid: string, email: string, hid = HID) => {
    const batch = writeBatch(db)
    batch.update(doc(db, 'households', hid), 'memberUids', arrayUnion(uid), new FieldPath('members', uid), profile('New', email))
    batch.delete(doc(db, 'invites', email))
    return batch.commit()
  }

  it('an invitee can join, and is then a member like any other', async () => {
    await seedInvite(BOB_EMAIL)
    await assertSucceeds(join(bob(), BOB, BOB_EMAIL))
    const db = bob()
    await assertSucceeds(getDoc(doc(db, 'households', HID)))
    await assertSucceeds(getDocs(collection(db, 'households', HID, 'meals')))
    await assertSucceeds(setDoc(doc(db, 'households', HID, 'meals', 'm2'), { name: 'Soup', archived: false }))
    // the invite is gone
    await env.withSecurityRulesDisabled(async (ctx) => {
      const snap = await getDoc(doc(ctx.firestore(), 'invites', BOB_EMAIL))
      if (snap.exists()) throw new Error('invite should have been consumed')
    })
  })

  it('the token email is matched case-insensitively', async () => {
    await seedInvite(BOB_EMAIL)
    await assertSucceeds(join(as(BOB, 'Bob@Example.com'), BOB, BOB_EMAIL))
  })

  it('joining without deleting the invite is still allowed', async () => {
    await seedInvite(BOB_EMAIL)
    await assertSucceeds(
      updateDoc(doc(bob(), 'households', HID), 'memberUids', arrayUnion(BOB), new FieldPath('members', BOB), profile('Bob', BOB_EMAIL)),
    )
  })

  it('a Stage 2 household with no members map accepts a joiner', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households', 'old'), { name: 'Old', memberUids: [ALICE], settings: {} })
    })
    await seedInvite(BOB_EMAIL, 'old')
    await assertSucceeds(join(bob(), BOB, BOB_EMAIL, 'old'))
  })

  it('cannot join without a matching invite', async () => {
    // no invite at all
    await assertFails(join(bob(), BOB, BOB_EMAIL))
    // invite for a different household
    await seedInvite(BOB_EMAIL, OTHER_HID)
    await assertFails(join(bob(), BOB, BOB_EMAIL))
    // invite addressed to someone else
    await seedInvite(CAROL_EMAIL)
    await assertFails(join(bob(), BOB, BOB_EMAIL))
    await assertFails(join(bob(), BOB, CAROL_EMAIL))
  })

  it('cannot join with an unverified or missing email', async () => {
    await seedInvite(BOB_EMAIL)
    await assertFails(join(as(BOB, BOB_EMAIL, false), BOB, BOB_EMAIL))
    await assertFails(join(as(BOB), BOB, BOB_EMAIL))
  })

  it('the join must be exactly self-append plus own profile', async () => {
    await seedInvite(BOB_EMAIL)
    const db = bob()
    const ref = doc(db, 'households', HID)
    const me = new FieldPath('members', BOB)
    // extra field
    await assertFails(updateDoc(ref, 'memberUids', arrayUnion(BOB), me, profile('B', BOB_EMAIL), 'name', 'Hijacked'))
    await assertFails(updateDoc(ref, 'memberUids', arrayUnion(BOB), me, profile('B', BOB_EMAIL), 'settings', { rotationSize: 9 }))
    // bringing a friend
    await assertFails(updateDoc(ref, 'memberUids', arrayUnion(BOB, CAROL), me, profile('B', BOB_EMAIL)))
    await assertFails(
      updateDoc(ref, 'memberUids', arrayUnion(BOB), me, profile('B', BOB_EMAIL), new FieldPath('members', CAROL), profile('C', CAROL_EMAIL)),
    )
    // replacing rather than appending
    await assertFails(updateDoc(ref, 'memberUids', [BOB], me, profile('B', BOB_EMAIL)))
    await assertFails(updateDoc(ref, 'memberUids', [BOB, ALICE], me, profile('B', BOB_EMAIL)))
    // no profile, or a malformed one
    await assertFails(updateDoc(ref, { memberUids: arrayUnion(BOB) }))
    await assertFails(updateDoc(ref, 'memberUids', arrayUnion(BOB), me, { name: 'B', email: BOB_EMAIL, admin: true }))
    // touching Alice's profile
    await assertFails(updateDoc(ref, 'memberUids', arrayUnion(BOB), new FieldPath('members', ALICE), profile('Evil', ALICE_EMAIL)))
  })

  it('an existing member cannot re-join, even with an invite', async () => {
    await seedInvite(ALICE_EMAIL)
    // arrayUnion of a uid already present changes nothing, so it evaluates as an
    // empty member edit and passes; the claim that matters is that duplicates can't
    // be written.
    await assertSucceeds(updateDoc(doc(alice(), 'households', HID), { memberUids: arrayUnion(ALICE) }))
    await assertFails(updateDoc(doc(alice(), 'households', HID), { memberUids: [ALICE, ALICE] }))
  })
})

describe('household subcollections', () => {
  it('a member can read and write meals and weekPlans', async () => {
    const db = alice()
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
    const db = bob()
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

describe('ingredients', () => {
  const ingredient = (name: string) => ({ name, nameLower: name.toLowerCase() })

  it('a member can create, update and delete a well-formed entry', async () => {
    const db = alice()
    const ref = doc(db, 'households', HID, 'ingredients', 'i1')
    await assertSucceeds(setDoc(ref, ingredient('Chicken Thighs')))
    await assertSucceeds(getDoc(ref))
    await assertSucceeds(getDocs(collection(db, 'households', HID, 'ingredients')))
    await assertSucceeds(updateDoc(ref, ingredient('Chicken thigh fillets')))
    await assertSucceeds(deleteDoc(ref))
  })

  it('rejects anything but { name, nameLower } with nameLower derived from name', async () => {
    const db = alice()
    const ref = doc(db, 'households', HID, 'ingredients', 'i1')
    await assertFails(setDoc(ref, { name: 'Rice' }))
    await assertFails(setDoc(ref, { name: 'Rice', nameLower: 'Rice' }))
    await assertFails(setDoc(ref, { name: 'Rice', nameLower: 'rice', staple: true }))
    await assertFails(setDoc(ref, { name: '', nameLower: '' }))
    await assertFails(setDoc(ref, { name: ' Rice', nameLower: ' rice' }))
    await assertFails(setDoc(ref, { name: 42, nameLower: '42' }))
    await assertFails(setDoc(ref, { name: 'x'.repeat(101), nameLower: 'x'.repeat(101) }))
  })

  it('rejects a malformed update, even from a member', async () => {
    const db = alice()
    const ref = doc(db, 'households', HID, 'ingredients', 'i1')
    await assertSucceeds(setDoc(ref, ingredient('Rice')))
    await assertFails(updateDoc(ref, { name: 'Basmati' }))
    await assertFails(updateDoc(ref, { nameLower: 'basmati' }))
  })

  it('accepts the batches the app writes: save-with-new-ingredient and rename fan-out', async () => {
    const db = alice()
    const save = writeBatch(db)
    save.set(doc(db, 'households', HID, 'ingredients', 'i1'), ingredient('Rice'))
    save.set(doc(db, 'households', HID, 'meals', 'm2'), {
      name: 'Egg fried rice',
      ingredients: [{ ingredientId: 'i1', name: 'Rice', quantity: 300, unit: 'g' }],
    })
    await assertSucceeds(save.commit())

    const rename = writeBatch(db)
    rename.update(doc(db, 'households', HID, 'ingredients', 'i1'), ingredient('Basmati rice'))
    rename.update(doc(db, 'households', HID, 'meals', 'm2'), {
      ingredients: [{ ingredientId: 'i1', name: 'Basmati rice', quantity: 300, unit: 'g' }],
    })
    await assertSucceeds(rename.commit())
  })

  it('is closed to non-members and the unauthenticated', async () => {
    const ref = (db: ReturnType<typeof alice>) => doc(db, 'households', HID, 'ingredients', 'i1')
    await assertFails(getDocs(collection(bob(), 'households', HID, 'ingredients')))
    await assertFails(setDoc(ref(bob()), ingredient('Rice')))
    await assertFails(getDoc(ref(as(null))))
    await assertFails(setDoc(ref(as(null)), ingredient('Rice')))
  })
})

describe('everything else', () => {
  it('founders is closed to clients in both directions, even to a founder', async () => {
    const db = alice()
    await assertFails(getDoc(doc(db, 'founders', ALICE_EMAIL)))
    await assertFails(getDocs(collection(db, 'founders')))
    await assertFails(setDoc(doc(db, 'founders', BOB_EMAIL), {}))
    await assertFails(setDoc(doc(bob(), 'founders', BOB_EMAIL), {}))
  })

  it('top-level collections outside households are closed', async () => {
    const db = alice()
    await assertFails(setDoc(doc(db, 'users', ALICE), { hello: true }))
    await assertFails(getDocs(collection(db, 'users')))
  })
})
