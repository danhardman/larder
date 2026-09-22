# Firebase setup

> §1–5 and §7 are done. §9 (the founders doc) is Stage 3 work; §6 (API key restrictions)
> is Stage 8 work. Everything here is manual console/CLI work.

Spec references: §7 (architecture), §7.1 (where the logic runs), §7.3 (auth), §8 (milestones).

---

## 1. Create the project

1. <https://console.firebase.google.com> → **Add project**.
2. Name it something like `larder` (the real project ID will get a suffix, e.g. `larder-4f21` — note it, you'll need it).
3. Google Analytics: **off**. Nothing here needs it.
4. Stay on the **Spark (free)** plan. The spec deliberately avoids Cloud Functions, so
   Blaze is not required.

## 2. Enable Firestore

1. **Build → Firestore Database → Create database**.
2. Start in **production mode** (locked rules). You'll write real rules in M1 —
   never ship test mode, since per §7.1 the rules *are* the entire authorization layer.
3. Location: pick a European region (`europe-west2` London, or `eur3` multi-region).
   **This cannot be changed later.**

## 3. Enable Google sign-in

1. **Build → Authentication → Get started**.
2. **Sign-in method → Google → Enable**. Set a support email.
3. Apple sign-in is explicitly rejected for v1 (§7.3) — skip it.

## 4. Register the web app and grab the config

1. Project settings (gear icon) → **Your apps** → **Web (`</>`)**.
2. Nickname `larder-web`. **Do not** tick "Also set up Firebase Hosting" —
   hosting is Cloudflare Pages (§7.2).
3. Copy the `firebaseConfig` values into a **`.env.local`** in the repo root
   (already gitignored by Vite's template):

```sh
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<project-id>
VITE_FIREBASE_STORAGE_BUCKET=<project-id>.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Per §7.3 leave `authDomain` as the default `<project>.firebaseapp.com` — the popup
flow needs no proxy.

These values are **not secrets** — a Firebase web config is public by design and ships
in the client bundle. What protects the data is Firestore security rules plus the API
key referrer restrictions below, not hiding the config.

## 5. Firebase CLI + emulators

The CLI is not installed on this machine. Install it globally (not as a project dep):

```sh
npm i -g firebase-tools
firebase login
```

Then, in the repo root:

```sh
firebase init
```

Select **Firestore** and **Emulators**. When prompted:

- Use an existing project → the one you just created.
- Rules file: `firestore.rules`, indexes: `firestore.indexes.json` (defaults are fine).
- Emulators: **Authentication** and **Firestore**. Accept the default ports
  (auth 9099, firestore 8080) and enable the **Emulator UI** (port 4000).

This writes `firebase.json`, `.firebaserc`, `firestore.rules` and
`firestore.indexes.json`. Commit all of them — `.firebaserc` only holds the project ID.

The emulators need a Java runtime (macOS ships only a stub `java`):

```sh
brew install openjdk
echo 'export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"' >> ~/.zshrc
```

Run with:

```sh
pnpm emulators      # firebase emulators:start --import=.emulator --export-on-exit
```

Emulator data is exported to `.emulator/` (gitignored) on a clean exit and imported on
the next start, so a seeded household survives restarts. `src/state/firebase.ts` wires
`connectAuthEmulator` / `connectFirestoreEmulator` behind `import.meta.env.DEV`, so
`pnpm dev` never touches production data.

First time through:

1. `pnpm dev`, open the app, **Sign in with Google** — the auth emulator offers to
   invent an account. It lands on the *invite only* screen: the rules only let a
   founder create a household (§9), and nobody is one yet.
2. `pnpm seed` — makes every auth-emulator account a founder, gives each one a
   household, and writes the 12-meal starter library (`src/data/seedLibrary.ts`) into
   every household that has no meals yet. Reload the app. Admin SDK against the
   emulators only; it refuses to run if either emulator host variable points
   anywhere else.

### Security rules

`firestore.rules` is the entire authorization layer (spec §7.1): a signed-in user may
read and write under `/households/{hid}/**` only if their uid is in that household's
`memberUids`. Joining and the beta gate (§9) are rules too. The rules are tested
against the emulator by `pnpm test:rules`.

**Deploy them yourself** whenever they change — the production project still has the
deny-all default until you do, and the deployed app shows a permission error rather
than a blank screen:

```sh
firebase deploy --only firestore:rules
```

## 6. Restrict the API key

Once you have a deployed origin (do this at deploy time, not before — it will break
local dev if you get it wrong):

1. <https://console.cloud.google.com/apis/credentials> → the auto-created
   **Browser key (auto created by Firebase)**.
2. **Application restrictions → HTTP referrers**. The list needs *three* kinds of
   entry, and missing the third is the trap:

   - your Pages domain(s) (§7.2);
   - `localhost`, if you ever hit prod from local dev;
   - **`https://<project>.firebaseapp.com/*`** — the origin serving
     `/__/auth/handler`, the page the Google popup lands on. That page calls the
     Identity Toolkit API with this same key, so if it isn't allowed the popup dies
     on Google's generic **"The requested action is invalid."** screen, with nothing
     in your own console to explain it. This is *not* covered by having the domain in
     Authorized domains (§7) — the two lists are unrelated.

   `<project>.web.app` is Hosting's alias for the same site; it only needs an entry if
   you point `authDomain` at it instead.

   To check a key without a browser:

   ```sh
   curl -s -H "Referer: https://<project>.firebaseapp.com/" \
     "https://identitytoolkit.googleapis.com/v1/projects?key=<api-key>"
   ```

   An allowed referrer returns the project's authorized-domain list; a blocked one
   returns `403 API_KEY_HTTP_REFERRER_BLOCKED`.

3. Serving the app with `Cross-Origin-Opener-Policy: same-origin-allow-popups`
   (`public/_headers`) keeps the popup handle readable, so a user dismissing the popup
   surfaces as `auth/popup-closed-by-user` rather than a promise that never settles.
   Chrome may still log a COOP warning during sign-in — Google's accounts page sets
   its own `same-origin` policy, and that half is not ours to change. It's noise.

## 7. Authorized domains for auth

**Authentication → Settings → Authorized domains**. `localhost` and
`<project>.firebaseapp.com` are there by default. Add your Cloudflare Pages domain —
sign-in is rejected from any origin not on this list.

Note the preview-deploy trap in `cloudflare-pages-setup.md`: hashed preview subdomains
won't match, so auth breaks on previews.

---

## 9. Beta lockdown: founders and invites

While the app is in beta it is closed. Any Google account can *sign in*, but the
rules only let a **founder** create a household, and the only other way in is an
invite from a member. Everyone else sees the *invite only* screen.

Do once, after deploying the rules:

1. **Firestore → Data → Start collection** `founders`.
2. Document ID: **your Google email, lower-cased** (e.g. `dan@example.com`). Add any
   field — the rules only check that the document exists.
3. Sign in on your phone. The app creates your household.

Nobody else needs a founders entry. To bring in your household: **Settings →
Invite someone**, type their Gmail address. When that account signs in it gets a
*Join* button; the rules accept the join because the token's email matches the
invite. The invite is consumed on join, and you can revoke one from the same screen.

Details the rules enforce, in case you're reading the console:

- `/invites/{email}` — one per address, created only by a member of the household it
  names, readable only by that address, deletable by the member or the invitee.
- `/founders/{email}` — never readable or writable from the client; only `exists()`
  inside the rules sees it.
- Membership can only grow. Removing a member is not built (nothing in v1 needs it);
  edit `memberUids` in the console if it ever comes up.

**To open the app up later** (anyone may found their own household): delete
`isFounder()` from the household `create` rule in `firestore.rules`, adjust the test
in `test/rules.test.ts`, redeploy.

Locally, `pnpm seed` makes every auth-emulator account a founder, so you never have
to do this by hand against the emulator.

---

## 8. M0 — do the auth spike before writing app code

Per §8, this is the first task and it gates everything else. The risk (§7.3): Google
`signInWithPopup` from an **installed iOS home-screen PWA** served from a non-Firebase
origin has historically failed, because the popup passes its result back via web storage
and standalone home-screen apps don't share storage with the browser that opened the popup.
The reports are several years old and it may now simply work — but find out before
building on it.

The spike:

1. This hello-world page + one **Sign in with Google** button.
2. Call `signInWithPopup` **directly in the click handler with no preceding `await`**,
   or Safari's popup blocker kills it.
3. Deploy to Cloudflare Pages, **add to home screen on the actual phone**, sign in.
   Mobile Safari alone won't reproduce it — installed standalone mode is the failing case.

**If it fails:** add a Cloudflare Pages Function that transparently forwards
`/__/auth/*` to `<project>.firebaseapp.com/__/auth/*` (a proxy, *not* a 302), then
switch to `signInWithRedirect`.

## 10. Not doing

- **Cloud Functions** — §7.1. Would require the Blaze plan and nothing here needs
  server-side trust.
- **Firebase Hosting** — replaced by Cloudflare Pages.
- **Firebase Storage** — only if meal photos are added later.
