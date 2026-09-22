/**
 * Seed the local Firestore emulator with the starter meal library.
 *
 *   pnpm emulators        # in one terminal
 *   (sign in to the app once, so a household exists)
 *   pnpm seed             # in another
 *
 * Writes `SEED_MEALS` into every household that has no meals yet. Uses the Admin
 * SDK, which bypasses the security rules — fine against the emulator, and the
 * reason this script refuses to run against anything else.
 */

import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { SEED_MEALS } from '../src/data/seedLibrary'

const EMULATOR = '127.0.0.1:8080'

// Set before the SDK initialises; with this set the Admin SDK needs no credentials.
process.env.FIRESTORE_EMULATOR_HOST ??= EMULATOR
if (process.env.FIRESTORE_EMULATOR_HOST !== EMULATOR) {
  console.error(`Refusing to seed: FIRESTORE_EMULATOR_HOST is ${process.env.FIRESTORE_EMULATOR_HOST}, expected ${EMULATOR}.`)
  process.exit(1)
}

// The project id only has to match what the app connects to (`.firebaserc`).
initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID ?? 'larder-67041' })
const db = getFirestore()

async function main() {
  const households = await db.collection('households').get()
  if (households.empty) {
    console.log('No households in the emulator yet — sign in to the app once first, then re-run.')
    return
  }

  for (const household of households.docs) {
    const meals = household.ref.collection('meals')
    const existing = await meals.limit(1).get()
    if (!existing.empty) {
      console.log(`${household.id} (${household.get('name')}): already has meals, skipped.`)
      continue
    }
    const batch = db.batch()
    for (const meal of SEED_MEALS) batch.set(meals.doc(meal.id), meal)
    await batch.commit()
    console.log(`${household.id} (${household.get('name')}): wrote ${SEED_MEALS.length} meals.`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
