/**
 * Seed the local emulators so a fresh sign-in can get going.
 *
 *   pnpm emulators                    # in one terminal
 *   pnpm seed you@example.com         # in another, before you sign in at all
 *
 * Naming an email up front is the short way round the beta gate: `/founders/{email}`
 * is keyed by address, not uid, so authorising it before the account exists means the
 * first sign-in founds a household instead of bouncing off the locked screen. Run
 * `pnpm seed` again afterwards to fill the new household with the starter library.
 * With no arguments it still promotes whatever accounts have already signed in.
 *
 * Two jobs, both idempotent:
 *   1. Emails named on the command line, plus every Auth-emulator account, become
 *      founders (`/founders/{email}`), since the rules only let founders create a
 *      household. Production has exactly one founder, written by hand in the
 *      console — see docs/firebase-setup.md §9.
 *   2. Every household with no meals yet gets `SEED_MEALS` and the ingredient
 *      catalog they point at. A founder with no household gets one first, so a
 *      single run of this script is enough.
 *
 * Uses the Admin SDK, which bypasses the security rules — fine against the
 * emulator, and the reason this script refuses to run against anything else.
 */

import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { SEED_INGREDIENTS, SEED_MEALS } from '../src/data/seedLibrary'

const FIRESTORE_EMULATOR = '127.0.0.1:8080'
const AUTH_EMULATOR = '127.0.0.1:9099'

// Set before the SDK initialises; with these set the Admin SDK needs no credentials.
process.env.FIRESTORE_EMULATOR_HOST ??= FIRESTORE_EMULATOR
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= AUTH_EMULATOR
if (process.env.FIRESTORE_EMULATOR_HOST !== FIRESTORE_EMULATOR) {
  console.error(`Refusing to seed: FIRESTORE_EMULATOR_HOST is ${process.env.FIRESTORE_EMULATOR_HOST}, expected ${FIRESTORE_EMULATOR}.`)
  process.exit(1)
}
if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== AUTH_EMULATOR) {
  console.error(`Refusing to seed: FIREBASE_AUTH_EMULATOR_HOST is ${process.env.FIREBASE_AUTH_EMULATOR_HOST}, expected ${AUTH_EMULATOR}.`)
  process.exit(1)
}

// The project id only has to match what the app connects to (`.firebaserc`).
initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID ?? 'larder-67041' })
const db = getFirestore()

/** Lower-cased to match the doc ids the rules look up via `myEmail()`. */
const preAuthorised = process.argv
  .slice(2)
  .map((arg) => arg.trim().toLowerCase())
  .filter(Boolean)

async function main() {
  for (const email of preAuthorised) {
    await db.doc(`founders/${email}`).set({ seededAt: FieldValue.serverTimestamp() }, { merge: true })
    console.log(`${email}: founder (no account yet — sign in as this address to found a household).`)
  }

  const { users } = await getAuth().listUsers(1000)
  if (users.length === 0 && preAuthorised.length === 0) {
    console.log('No accounts in the auth emulator yet — sign in to the app once first, or name an email: pnpm seed you@example.com')
    return
  }

  for (const user of users) {
    if (!user.email) continue
    const email = user.email.trim().toLowerCase()
    await db.doc(`founders/${email}`).set({ seededAt: FieldValue.serverTimestamp() }, { merge: true })
    console.log(`${email}: founder.`)

    const memberOf = await db.collection('households').where('memberUids', 'array-contains', user.uid).limit(1).get()
    if (memberOf.empty) {
      // Same shape as `createHousehold` in src/state/db.ts.
      const ref = await db.collection('households').add({
        name: 'Our larder',
        memberUids: [user.uid],
        members: { [user.uid]: { name: user.displayName || email, email } },
        settings: { recencyWindowWeeks: 2, rotationSize: 2 },
        createdAt: FieldValue.serverTimestamp(),
      })
      console.log(`${email}: created household ${ref.id}.`)
    }
  }

  const households = await db.collection('households').get()
  for (const household of households.docs) {
    const meals = household.ref.collection('meals')
    const existing = await meals.limit(1).get()
    if (!existing.empty) {
      console.log(`${household.id} (${household.get('name')}): already has meals, skipped.`)
      continue
    }
    const ingredients = household.ref.collection('ingredients')
    const batch = db.batch()
    for (const { id, name, nameLower } of SEED_INGREDIENTS) batch.set(ingredients.doc(id), { name, nameLower })
    for (const meal of SEED_MEALS) batch.set(meals.doc(meal.id), meal)
    await batch.commit()
    console.log(
      `${household.id} (${household.get('name')}): wrote ${SEED_MEALS.length} meals and ${SEED_INGREDIENTS.length} ingredients.`,
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
