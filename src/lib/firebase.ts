import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

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

export const app = initializeApp(config)
export const auth = getAuth(app)

export const googleProvider = new GoogleAuthProvider()
// Always show the chooser — signing in as the wrong account on a shared household
// is the confusing failure, not an extra tap.
googleProvider.setCustomParameters({ prompt: 'select_account' })
