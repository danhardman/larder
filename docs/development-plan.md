# Larder — development plan

Staged breakdown of `meal-planner-spec.md`. Each stage is sized to be built, then reviewed, before the
next one starts. Stages marked ⚠️ contain manual work only you can do (Firebase console, Cloudflare
dashboard, physical phone) — those steps are called out explicitly.

## Context

What exists today is a **working local-only prototype**: the design was implemented faithfully, but it was
built against a subset of the spec. The app runs, 28 tests pass, `tsc -b` is clean.

**Already done, and good — do not rebuild:**

| Area | Where | State |
|---|---|---|
| Domain types | `src/types.ts` | Match the spec almost exactly — `Meal`, `MealIngredient`, `Slot`, `WeekPlan`, all enums |
| Plan generator | `src/lib/generatePlan.ts` | Pure, seeded, season filters, no-dinner-repeats, protein/carb variety, recency window, breakfast/lunch rotation, locked-slot pass-through. 11 tests |
| Shopping list | `src/lib/shoppingList.ts` | Pure, groups by `(name, unit)`, sums, per-meal breakdown, text format. 5 tests |
| Stats + portion warnings | `src/lib/stats.ts` | `statsByMeal`, `portionWarning` with the 3-rated-cook floor |
| Tick-off tracking | `src/App.tsx`, `src/screens/WeeksScreen.tsx` | eaten/skipped + skip reasons + optional, skippable portion rating |
| Meal CRUD | `src/components/MealEditor.tsx` | Create/edit/archive/restore/delete, delete guarded by `usedMealIds` |
| Setup docs | `docs/firebase-setup.md`, `docs/cloudflare-pages-setup.md` | Already written and accurate — the stages below point at them rather than repeating them |

**The gaps:** no Firebase at all (SDK installed, never imported), no household scoping, no auth, no real
ingredient catalog, no Settings screen, no insights view, plus dead stubs (`effort`, `skipNote`, the
`Ingredient` interface) and three genuine bugs.

**Intended outcome:** a shared, installable, Firestore-backed PWA on Cloudflare Pages.

### Decisions taken

- **Sequencing:** auth spike first, then Firestore migration, then features. Migrating a small app is
  cheaper than migrating a big one.
- **Scope:** everything through M3.
- **Meal `stats`:** stay **derived** (`src/lib/stats.ts`), not denormalised onto the meal doc. The spec's
  rollup is a read-optimisation for a dataset this app won't reach for years; deriving avoids
  write-amplification and drift. Revisit if reads get slow. *(Deliberate deviation from spec §3.)*

---

## Stage 0 — M0 auth spike ⚠️

Spec §7.3, §8. **This gates everything else.** The risk: Google `signInWithPopup` from an *installed iOS
home-screen PWA* on a non-Firebase origin has historically failed — the popup returns its result via web
storage, and standalone home-screen apps don't share storage with the browser that opens the popup. The
reports are several years old and it may simply work now. The answer decides whether auth is three lines
or needs a Cloudflare Pages Function proxy.

**Your manual work** (all of it):

1. Create the Firebase project, enable Firestore + Google sign-in, register the web app.
   → `docs/firebase-setup.md` §1–4. Put the config in `.env.local`.
2. Push the repo to GitHub, create the Cloudflare Pages project. → `docs/cloudflare-pages-setup.md` §2.
3. Add the `*.pages.dev` domain to Firebase **Authorized domains** (`firebase-setup.md` §7).
4. Deploy, **add to home screen on your actual phone**, tap sign in.
   Mobile Safari alone will not reproduce the failure — installed standalone mode is the failing case.

**My work — done.** Rather than a separate throwaway page, the whole app is gated behind sign-in, so the
spike exercises the real flow:

- `src/lib/firebase.ts` — app + auth init from the `VITE_FIREBASE_*` env vars, plus a `missingConfig`
  export so an unset Cloudflare variable shows up as a message rather than a blank screen.
- `src/state/auth.tsx` — `AuthProvider` / `useAuth`. `signInWithPopup` is called **directly in the click
  handler with no preceding `await`** (Safari's popup blocker kills it otherwise).
- `src/screens/SignInScreen.tsx` — the Google button, the failure readout (error code + message), a
  **Try redirect instead** button that appears on failure, and a diagnostics line showing whether the app
  is running standalone or in a browser tab.
- `src/components/AuthGate.tsx` — renders the sign-in screen until there's a user. It also adds a
  spike-only account pill (top right) with **Sign out**, since there's no Settings screen until Stage 5
  and without it you can't re-test sign-in on the phone.
- `public/_redirects` and `public/_headers` (`cloudflare-pages-setup.md` §3).

No household check yet — any Google account gets in. Stage 3 adds membership.

**Before deploying:** set every `VITE_FIREBASE_*` value in Cloudflare Pages → Settings → Environment
variables (`cloudflare-pages-setup.md`). Vite inlines them at build time, so the currently deployed build
has to be rebuilt after they're set.

**Review checkpoint:** you tell me whether sign-in worked from the installed PWA.

- **Worked** → Stage 3 uses `signInWithPopup`. Delete the spike page.
- **Failed** → Stage 3 also needs a Pages Function forwarding `/__/auth/*` to
  `<project>.firebaseapp.com/__/auth/*` (a transparent proxy, **not** a 302), and switches to
  `signInWithRedirect`.

---

## Stage 1 — Correctness fixes in the pure modules

No Firebase, so this is independent of Stage 0 and can be done while you're in the console. It lives in
pure `src/lib/` modules the Firestore migration won't touch, so none of it gets thrown away.

1. **Season is wrong for future weeks.** `src/state/store.tsx:52` passes `currentSeason()` when drafting
   *any* week — a plan drafted in late February for a March week gets winter meals. Derive the season from
   the week being planned, via the existing `seasonForMonth` in `src/lib/dates.ts`.
2. **`skipNote` is dead.** Declared at `src/types.ts:54`, never written or read. Wire a free-text input
   into the skip sheet (`src/App.tsx`, `mode: 'skip'`), shown only for the `other` reason — per the spec's
   "must not add friction" rule.
3. **`statsByMeal` and `portionWarning` are untested.** `src/lib/stats.test.ts` only covers `mealsInUse`.
   Add cases for the eaten/skipped split, the `timesRated` denominator, and the 3-cook floor.
4. **`strict` is not enabled.** Neither `tsconfig.app.json` nor `tsconfig.node.json` sets `"strict": true`
   — the Vite template default is absent. Turn it on now; the cost only grows with every later stage.

**Review:** `pnpm test`, `pnpm typecheck`, `pnpm lint`. Draft a week and confirm the season label matches
the target week, not today.

---

## Stage 2 — Firestore backbone + household scoping ⚠️

Spec §3, §7.1. The largest structural change. The spec wanted household scoping "from day one" precisely
to avoid this — so it happens in one deliberate stage rather than leaking through later ones.

**Your manual work:**

1. `npm i -g firebase-tools && firebase login`, then `firebase init` — Firestore + Emulators; auth 9099,
   firestore 8080, Emulator UI 4000. → `docs/firebase-setup.md` §5.
2. Commit the generated `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`.

**My work:**

- `src/lib/firebase.ts` — init app, Firestore with **offline persistence enabled** (spec §5: the shopping
  list must work in a supermarket with no signal), and `connectAuthEmulator` / `connectFirestoreEmulator`
  behind `import.meta.env.DEV` so local dev never touches production data.
- **Write `firestore.rules`** — read/write under `/households/{hid}/**` only if the auth token's
  `householdId` claim equals `hid`. Per spec §7.1 the rules *are* the entire authorization layer; this is
  the one piece where a permissive default loses the whole security model.
- **Rewrite `src/state/store.tsx`** against Firestore collections `meals`, `ingredients`, `weekPlans` under
  `/households/{hid}`, keeping the `useLarder()` interface **unchanged** so no screen has to change. That
  constraint is what makes this stage reviewable — the UI should behave identically afterwards.
- `settings` moves onto the household doc; `ticked` (shopping ticks) onto the week plan doc.
- **Seed script** (`scripts/seed.ts`, plain Node) writing `src/lib/seedLibrary.ts`'s 12 meals into the
  emulator.
- **One-time localStorage → Firestore import**, so prototype data you've already entered survives.

**Review:** run the emulator, confirm every screen works unchanged, then kill the network and confirm the
shopping list still renders and ticks.

---

## Stage 3 — Auth gate, household membership, sharing (M2)

Shape depends on Stage 0's answer.

- Sign-in screen; app gated behind an authed user with a household.
- Invite/join a second member.
- Plan history already feeds the recency rules (`recentDinnerIds`), so nothing new is needed there.

**Open decision — the custom claim.** The spec wants `householdId` as a custom claim, but setting one
requires the Admin SDK, and spec §7.1 forbids Cloud Functions. Two ways out, both fine at this scale:

- **(a)** Set the claim from a local Admin-SDK script when you add a member — you run it once per person,
  ever. Keeps the spec's rule shape exactly.
- **(b)** *(recommended)* Drop the claim; have the rule read `memberUids` off the household doc:
  `get(/databases/$(db)/documents/households/$(hid)).data.memberUids.hasAny([request.auth.uid])`.
  No Admin SDK, self-service invites, costs one extra document read per rule evaluation.

I'll ask you to pick when we reach this stage.

**Your manual work:** sign in on both phones, confirm you see the same data.

---

## Stage 4 — Real ingredient catalog

Spec §3. Today `ingredientId` is faked as `name.toLowerCase()` (`src/components/MealEditor.tsx:35`, `:91`)
and the autocomplete list is derived on the fly from meal names (`src/App.tsx:211-219`). The `Ingredient`
interface at `src/types.ts:34` is never imported by anything.

**This is a correctness bug, not tidiness:** `buildShoppingList` keys on the raw `item.name`
(`src/lib/shoppingList.ts:35`), so "Chicken thighs" and "chicken thighs" become two separate lines that
never sum.

- Real `/households/{hid}/ingredients` docs with `nameLower`, created on demand from the meal editor.
- Case-insensitive uniqueness enforced on create; prefix search on `nameLower` for autocomplete.
- Rename fan-out: a batched write updating the denormalised `name` on every meal using that ingredient
  (spec §3 accepts this cost at household scale).
- Pantry staples stay **out** of the catalog entirely — no staples flag in v1 (spec §3).

**Review:** add "Chicken Thighs" to one meal and "chicken thighs" to another; the shopping list must show
one summed line.

---

## Stage 5 — Settings screen

Spec §6. `recencyWindowWeeks` and `rotationSize` are already plumbed end-to-end into the generator, and
`updateSettings` exists at `src/state/store.tsx:133` but **is never called by anything**. Mostly a form.

- Fourth tab in `src/components/TabBar.tsx` (currently three: weeks / library / shop).
- Recency window + rotation size controls, household members list, sign-out.

**Review:** set rotation size to 1, regenerate a week, confirm breakfasts stop varying.

---

## Stage 6 — Waste insights view (M3)

Spec §8. Read-only reporting over accumulated outcome data. **Purely informational — it never feeds the
generator.** Spec §4 is emphatic that outcome data must not creep into generation.

- **Portion warnings:** meals rated `too_much` on a majority of rated cooks, minimum 3 rated cooks.
  `portionWarning` (`src/lib/stats.ts:62`) already implements exactly this — the view aggregates it across
  the library and links each row to the meal editor, which is where the fix actually gets made.
- **Skip patterns:** which meals get planned but never cooked, which weekdays reliably get skipped, and the
  breakdown by skip reason. Needs new pure aggregation functions in `src/lib/stats.ts` — skip reasons are
  currently only rendered per-slot, never aggregated.
- New pure functions get unit tests; that's where the logic lives.

**Worth stating plainly:** this view says nothing useful until months of data exist. It's built now because
the *capture* is already in place, not because it will read well immediately.

---

## Stage 7 — Remaining M3 polish

Lowest-value items, batched last so you can stop before them without losing anything.

- **Effort-based weekday weighting.** `effort` is typed (`src/types.ts:30`) and round-tripped
  (`MealEditor.tsx:102`) but has no UI and nothing reads it. Add the editor control, then weight `quick`
  toward weekdays and `involved` toward weekends in `scoreDinner` (`src/lib/generatePlan.ts:52`).
- **Summed ↔ expanded toggle** on the shopping list (spec §5) — the breakdown is currently permanently
  inline (`src/screens/ShoppingScreen.tsx:86`).
- **Shopping list for an arbitrary week** — only the next accepted week is reachable today
  (`src/App.tsx:126-129`).
- **PWA raster icons.** `vite.config.ts` ships only `favicon.svg`; iOS home-screen install wants PNGs
  (192/512 + apple-touch-icon).

---

## Stage 8 — Production hardening ⚠️

**Your manual work** — all console-side, and each one fails *silently* if skipped:

1. **API key referrer restrictions** — Google Cloud console (`docs/firebase-setup.md` §6). Do this at
   deploy time, not before; getting it wrong breaks local dev.
2. **Cloudflare env vars** — every `VITE_FIREBASE_*` value, for **both** Production and Preview. Vite
   inlines these at build time, so a missing one is a runtime failure, not a build error.
3. **The preview-deploy trap** — preview deploys get hashed subdomains that never match the authorized
   domains list, so sign-in breaks on every preview. Pick one: point previews at the emulator, or run a
   separate Firebase project for staging (`docs/cloudflare-pages-setup.md` §5).

**My work:** verify `_headers` keeps `sw.js` uncached (the classic stale-service-worker trap), confirm
`_redirects` handles SPA deep links, check the production bundle boots against real Firestore.

---

## Verification (every stage)

- `pnpm test` and `pnpm typecheck` — both green today (28 tests, 4 files); keep them green.
- `pnpm lint` (oxlint).
- `pnpm dev` alongside `firebase emulators:start` from Stage 2 onward — never against production data.
- A manual pass on the phone for anything touching auth or install behaviour. The desktop browser will not
  reproduce the failure modes that matter here.

## Dependency order

```
Stage 0 (spike) ─┬─> Stage 2 (Firestore) ──> Stage 3 (auth) ──> Stage 5 (settings) ──┐
                 │                       └──> Stage 4 (ingredients) ─────────────────┤
Stage 1 (fixes) ─┘                                                                   ├──> Stage 8
                                            Stage 6 (insights) ─────────────────────┤
                                            Stage 7 (polish) ───────────────────────┘
```

Stage 1 is independent of Stage 0 and can run while you're in the Firebase console.
Stages 6 and 7 depend only on Stage 2.
