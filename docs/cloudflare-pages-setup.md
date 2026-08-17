# Cloudflare Pages setup

> **Not needed yet.** No Cloudflare config files have been created and nothing has
> been deployed. This is the checklist for when you get there — the earliest real need
> is the M0 auth spike (see `firebase-setup.md` §8), which does require a deployed URL.

Spec reference: §7.2.

---

## 1. Prerequisite

A git remote (GitHub) with this repo pushed. The repo isn't initialised yet — that's
your call to make.

## 2. Create the project

Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** →
pick the repo.

Build settings:

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Root directory | `/` |

Environment variables: add every `VITE_FIREBASE_*` value from `.env.local`
(`firebase-setup.md` §4) under **Settings → Environment variables**, for both
**Production** and **Preview**. Vite inlines them at build time, so a missing one is a
silent runtime failure, not a build error.

Set `NODE_VERSION` to `24` if the default build image is older than the local Node.

## 3. Files to add before the first deploy

Neither of these exists yet — create them in `public/`, which Vite copies to `dist/`
verbatim.

**`public/_redirects`** — SPA deep links. Without it, refreshing on any route that isn't
`/` returns a Cloudflare 404:

```
/* /index.html 200
```

**`public/_headers`** — stop the service worker being cached. Cloudflare caches
aggressively by default, and a stale `sw.js` is the classic "why is my deploy not
appearing" trap (§7.2):

```
/sw.js
  Cache-Control: no-cache
```

## 4. Firebase-side wiring

Two things must happen on the Firebase/GCP side or auth silently fails
(both detailed in `firebase-setup.md`):

- **Authorized domains** — add the `*.pages.dev` domain (and any custom domain) under
  Authentication → Settings.
- **API key referrer allowlist** — add the same domains in the Google Cloud console.

## 5. The preview-deploy trap

Preview deploys get **hashed subdomains** (`abc123.larder.pages.dev`) that will never
match the authorized-domains list, so **sign-in breaks on every preview**. Per §7.2, pick
one:

- point previews at the Firebase emulator, or
- run a **separate Firebase project for staging** and set the preview environment
  variables to it.

Do nothing and previews will look broken in a way that has nothing to do with your code.

## 6. Custom domain (optional)

Pages project → **Custom domains**. If you add one, it needs adding to the Firebase
authorized domains and the API key referrer list too.

---

Local development is unaffected by all of this — the emulator connection is SDK config,
independent of hosting.
