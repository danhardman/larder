/**
 * Firebase app, auth and Firestore initialisation from the `VITE_FIREBASE_*` env
 * vars. The one place the SDK is configured; `state/auth.tsx` consumes `auth` and
 * `googleProvider`, `state/db.ts` and `state/store.tsx` consume `db`.
 */

import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

// The web config is public by design — it ships in the client bundle. What protects
// the data is Firestore rules plus API key referrer restrictions (docs/firebase-setup.md §6),
// not hiding these values.
const config: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** Vite inlines these at build time, so a missing one is a runtime failure, not a build
 *  error (docs/development-plan.md, Stage 8). Name the gap loudly instead. */
export const missingConfig = Object.entries(config)
  .filter(([, value]) => !value)
  .map(([key]) => key)

/** The initialised app. */
export const app = initializeApp(config)
/** Auth instance consumed by `state/auth.tsx`. */
export const auth = getAuth(app)

/**
 * Firestore with offline persistence: the shopping list has to work in a supermarket
 * with no signal (spec §5), so the week and its meals stay in IndexedDB and writes
 * queue until signal returns. The multi-tab manager lets two desktop tabs share the
 * cache instead of the second one failing to open it.
 *
 * `ignoreUndefinedProperties` covers the optional fields (`effort?`, `skipNote?`):
 * Firestore rejects `undefined` outright, and stripping it here is simpler than
 * remembering to at every write.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
})

// Local dev never touches production data. Ports match `firebase.json` — they are
// duplicated here by hand because the SDK can't read that file.
if (import.meta.env.DEV) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

/** Google sign-in, the only provider the household uses. */
export const googleProvider = new GoogleAuthProvider()
// Always show the chooser — signing in as the wrong account on a shared household
// is the confusing failure, not an extra tap.
googleProvider.setCustomParameters({ prompt: 'select_account' })
