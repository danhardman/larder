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
| Domain types | `src/types/` | Match the spec almost exactly — `Meal`, `MealIngredient`, `Slot`, `WeekPlan`, all enums |
| Plan generator | `src/lib/generatePlan.ts` | Pure, seeded, season filters, no-dinner-repeats, protein/carb variety, recency window, breakfast/lunch rotation, locked-slot pass-through. 11 tests |
| Shopping list | `src/lib/shoppingList.ts` | Pure, groups by `(name, unit)`, sums, per-meal breakdown, text format. 5 tests |
| Stats + portion warnings | `src/lib/stats.ts` | `statsByMeal`, `portionWarning` with the 3-rated-cook floor |
| Tick-off tracking | `src/features/weeks/` (`useSlotActions.ts`, `SlotSheet.tsx`, `LiveWeek.tsx`) | eaten/skipped + skip reasons + optional, skippable portion rating |
| Meal CRUD | `src/features/library/` (`MealEditor.tsx`, `useLibrary.ts`) | Create/edit/archive/restore/delete, delete guarded by `usedMealIds` |
| Setup docs | `docs/firebase-setup.md`, `docs/cloudflare-pages-setup.md` | Already written and accurate — the stages below point at them rather than repeating them |
| Firestore store | `src/state/store.tsx`, `src/state/db.ts`, `firestore.rules` | Stage 2 — household-scoped, offline-first, rules tested |

**The gaps:** no Firebase at all (SDK installed, never imported), no household scoping, no auth, no real
ingredient catalog, no Settings screen, no insights view, plus dead stubs (`effort`, the
`Ingredient` interface) and three genuine bugs.

**Intended outcome:** a shared, installable, Firestore-backed PWA on Cloudflare Pages.

### Decisions taken

- **Sequencing:** auth spike first, then Firestore migration, then features. Migrating a small app is
  cheaper than migrating a big one.
- **Scope:** everything through M3.
- **Meal `stats`:** stay **derived** (`src/lib/stats.ts`), not denormalised onto the meal doc. The spec's
  rollup is a read-optimisation for a dataset this app won't reach for years; deriving avoids
  write-amplification and drift. Revisit if reads get slow. *(Deliberate deviation from spec §3.)*
- **Layout (tidy-up before Stage 2, Sep 2026):** UI code is grouped by feature under `src/features/`,
  each feature owning its screen, hooks and sub-components; `src/types/` is the persisted domain model;
  `src/lib/` stays pure and tested. `README.md` has the folder map. Stage 2 still only touches
  `src/state/store.tsx`.

---

## Stage 0 — M0 auth spike ✅ done

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

- `src/state/firebase.ts` — app + auth init from the `VITE_FIREBASE_*` env vars, plus a `missingConfig`
  export so an unset Cloudflare variable shows up as a message rather than a blank screen.
- `src/state/auth.tsx` — `AuthProvider` / `useAuth`. `signInWithPopup` is called **directly in the click
  handler with no preceding `await`** (Safari's popup blocker kills it otherwise).
- `src/features/auth/SignInScreen.tsx` — the Google button and the failure readout (error code + message).
  The **Try redirect instead** button and the standalone/browser diagnostics line were spike-only and
  have been removed.
- `src/features/auth/AuthGate.tsx` — renders the sign-in screen until there's a user. It also adds a
  spike-only account pill (top right) with **Sign out**, since there's no Settings screen until Stage 5
  and without it you can't re-test sign-in on the phone.
- `public/_redirects` and `public/_headers` (`cloudflare-pages-setup.md` §3).

No household check yet — any Google account gets in. Stage 3 adds membership.

**Before deploying:** set every `VITE_FIREBASE_*` value in Cloudflare Pages → Settings → Environment
variables (`cloudflare-pages-setup.md`). Vite inlines them at build time, so the currently deployed build
has to be rebuilt after they're set.

### Outcome — popup works, no proxy needed

Tested from the installed home-screen PWA on the real phone: **`signInWithPopup` works.** The
years-old storage-partitioning failure did not reproduce. So:

- **Stage 3 uses `signInWithPopup`.** The Cloudflare Pages Function proxying `/__/auth/*` is *not*
  needed and should not be built.
- The redirect fallback (`signInWithGoogleRedirect`, `getRedirectResult`) has been removed along with
  the rest of the spike scaffolding — it only ever existed to answer this question, and on a
  non-Firebase origin it is the path storage partitioning actually breaks. `git log` has it if a
  device ever proves otherwise.

Two configuration traps surfaced while testing, both now written up in `firebase-setup.md`:

- The API key's HTTP-referrer allowlist must include **`https://<project>.firebaseapp.com/*`** — the
  origin serving `/__/auth/handler`. Without it the popup dies on Google's generic *"The requested
  action is invalid."* screen with nothing in the app's own console. This is separate from, and not
  covered by, Authorized domains. (`firebase-setup.md` §6)
- `public/_headers` now sets `Cross-Origin-Opener-Policy: same-origin-allow-popups` so a dismissed
  popup surfaces as `auth/popup-closed-by-user` instead of a promise that never settles. Chrome still
  logs a COOP warning during sign-in — that comes from Google's accounts page, and is noise.

**Still carried forward:** the account pill in `src/features/auth/AuthGate.tsx` stays until Stage 5 gives
it a real Settings screen. Since Stage 2, a Google account that gets in lands in its own household;
Stage 3 adds joining someone else's.

---

## Stage 1 — Correctness fixes in the pure modules ✅ done

No Firebase, so this is independent of Stage 0 and can be done while you're in the console. It lives in
pure `src/lib/` modules the Firestore migration won't touch, so none of it gets thrown away.

1. **Season is wrong for future weeks.** `src/state/store.tsx:52` passes `currentSeason()` when drafting
   *any* week — a plan drafted in late February for a March week gets winter meals. Derive the season from
   the week being planned, via the existing `seasonForMonth` (now `src/lib/seasons.ts`).
2. **`skipNote` is dead.** Declared on `Slot` (now `src/types/plan.ts`), never written or read. Wire a free-text input
   into the skip sheet (now `src/features/weeks/SlotSheet.tsx`, `mode: 'skip'`), shown only for the `other` reason — per the spec's
   "must not add friction" rule.
3. **`statsByMeal` and `portionWarning` are untested.** `src/lib/stats.test.ts` only covers `mealsInUse`.
   Add cases for the eaten/skipped split, the `timesRated` denominator, and the 3-cook floor.
4. **`strict` is not enabled.** Neither `tsconfig.app.json` nor `tsconfig.node.json` sets `"strict": true`
   — the Vite template default is absent. Turn it on now; the cost only grows with every later stage.

**Review:** `pnpm test`, `pnpm typecheck`, `pnpm lint`. Draft a week and confirm the season label matches
the target week, not today.

### Outcome

All four done. 43 tests across 5 files, `tsc -b` and `oxlint` clean.

- **Season** — new `seasonForWeek` (now `src/lib/seasons.ts`). A week takes the season of the month it
  *starts* in, so a Mon-23-Feb week stays winter even though it reaches March; the rule is deliberate
  and commented. `src/state/store.tsx` drafts with it, and the UI (now `src/features/weeks/`) no longer holds a single
  module-level `currentSeason()` — the season label, the thin-library hint, the re-roll and the
  pick-from-library candidate list each derive it from the week they actually act on.
- **`skipNote`** — "Something else" is now the only skip reason that costs a second tap: it opens a
  note field with **Save** and **Skip without a note**. The named reasons still commit on one tap, per
  the spec's no-friction rule. An empty note stays `null`. The live-week slot shows the note in place
  of "Skipped"; the past-week micro-grid keeps `SKIP_REASON_SHORT`, since free text doesn't fit a
  9.5px fixed-height cell. `markSkipped` now resolves its own toast label from `SKIP_REASONS` rather
  than taking it as an argument.
- **Tests** — `statsByMeal` (draft weeks excluded, eaten/skipped split, `timesRated` counting only
  rated cooks, stale feedback on a skipped slot ignored) and `portionWarning` (the 3-cook floor, both
  warning directions, and the 2-of-4 tie that must *not* warn). `seasonForMonth`'s tests moved from
  `generatePlan.test.ts` into the new `src/lib/dates.test.ts` alongside `seasonForWeek`.
- **`strict`** — on in both `tsconfig.app.json` and `tsconfig.node.json`, and it cost nothing: the
  existing tree was already strict-clean. `noUncheckedIndexedAccess` was deliberately left off; it
  does produce errors across the slot indexing and belongs to its own decision.

---

## Stage 2 — Firestore backbone + household scoping ✅ done

Spec §3, §7.1. The largest structural change. The spec wanted household scoping "from day one" precisely
to avoid this — so it happens in one deliberate stage rather than leaking through later ones.

**Your manual work:**

1. `npm i -g firebase-tools && firebase login`, then `firebase init` — Firestore + Emulators; auth 9099,
   firestore 8080, Emulator UI 4000. → `docs/firebase-setup.md` §5.
2. Commit the generated `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`.

**My work:**

- `src/state/firebase.ts` — init app, Firestore with **offline persistence enabled** (spec §5: the shopping
  list must work in a supermarket with no signal), and `connectAuthEmulator` / `connectFirestoreEmulator`
  behind `import.meta.env.DEV` so local dev never touches production data.
- **Write `firestore.rules`** — read/write under `/households/{hid}/**` only if the caller's uid is in
  the household's `memberUids` (spec §3 — the custom-claim wording this stage originally carried was
  superseded by the spec). Per spec §7.1 the rules *are* the entire authorization layer; this is the one
  piece where a permissive default loses the whole security model.
- **Rewrite `src/state/store.tsx`** against Firestore collections `meals`, `ingredients`, `weekPlans` under
  `/households/{hid}`, keeping the `useLarder()` interface **unchanged** so no screen has to change. That
  constraint is what makes this stage reviewable — the UI should behave identically afterwards.
- `settings` moves onto the household doc; `ticked` (shopping ticks) onto the week plan doc.
- **Seed script** (`scripts/seed.ts`, plain Node) writing `src/data/seedLibrary.ts`'s 12 meals into the
  emulator.
- **One-time localStorage → Firestore import**, so prototype data you've already entered survives.

**Review:** run the emulator, confirm every screen works unchanged, then kill the network and confirm the
shopping list still renders and ticks.

### Outcome

- **Layout** — `src/state/db.ts` (paths, snapshot → domain mappers with defaults, `findOrCreateHousehold`)
  under `src/state/store.tsx` (three `onSnapshot` subscriptions, actions writing straight to documents).
  `src/state/storage.ts` is gone; `newId` moved to `src/lib/ids.ts`, `DEFAULT_SETTINGS` to
  `src/types/settings.ts`. New `src/types/household.ts`.
- **Household bootstrap** — on first sign-in the store queries `households` by `memberUids
  array-contains uid` and creates a household of one if there is none. That is the whole membership
  layer for now; Stage 3 adds joining.
- **Document ids** — meals use `meal.id`; **week plans use `weekStart` as the doc id** (deviation from
  the spec's uuid: one plan per week becomes structural and two devices drafting the same week offline
  converge on one document; the `id` field is still stored). `settings` sits on the household doc,
  `ticked` on the plan doc as a map written per key via `FieldPath` so `.` in ingredient names is safe.
- **Spec §7.4 constraints honoured** — `draftWeek` is now `Promise<void>` and `thin` is persisted on
  the plan; `Planner` reads the hint off the document (it survives reloads and shows on both phones).
  `WeekPlan.status` carries `generating` / `failed` and the weeks screens render both. This was the one
  change to the `useLarder()` interface; everything else is untouched.
- **Offline** — `initializeFirestore` with `persistentLocalCache` + multi-tab manager. Writes are
  deliberately not awaited: with persistence a write promise only settles on server ack, so awaiting
  would hang in the supermarket. The local snapshot drives the UI; rejected writes surface as an error
  screen (which is also what a not-yet-deployed rules file looks like in production).
- **No localStorage import** — the prototype data wasn't worth keeping.
- **Rules test** (`test/rules.test.ts`, `pnpm test:rules`) — worth it on the first run: a bare
  `{document=**}` nested under `/households/{hid}` also matches zero segments in rules v2, i.e. the
  household doc itself, which let a member delete the household or drop their own membership. Now a
  single-segment `{collection}` wildcard sits in front of it.
- **Tooling** — `pnpm emulators` (with `--import=.emulator --export-on-exit`), `pnpm seed`
  (`scripts/seed.ts`, Admin SDK, refuses to run off-emulator), `pnpm test:rules`. `tsconfig.node.json`
  moved to bundler resolution so `scripts/` and `test/` share the app's import style.

**Still to do by hand:** `firebase deploy --only firestore:rules` before the next Cloudflare deploy;
then the phone check (sign in, see an empty household, draft a week, go offline, tick the list).

---

## Stage 3 — Auth gate, household membership, sharing (M2)

Stage 0 settled the shape: **`signInWithPopup`, no `/__/auth/*` proxy.** The sign-in screen, the
`AuthProvider` and the gate already exist and work — this stage adds the household layer on top rather
than building auth from scratch.

- ~~Sign-in screen; app gated behind an authed user~~ (done in Stage 0) — extend the gate to also
  require a household.
- Invite/join a second member.
- Plan history already feeds the recency rules (`recentDinnerIds`), so nothing new is needed there.

**Decided (spec §3, §9): no custom claim.** The rules read `memberUids` off the household doc, and Stage 2
already ships them that way. This stage only has to add a way to put a second uid into that array —
the `create`/`update` rules currently allow a household of exactly one, and will need to loosen to
accept an invite.

**Your manual work:** sign in on both phones, confirm you see the same data.

---

## Stage 4 — Real ingredient catalog

Spec §3. Today `ingredientId` is faked as `name.toLowerCase()` (`blankIngredient` and the save path in `src/features/library/MealEditor.tsx`)
and the autocomplete list is derived on the fly from meal names (`src/features/library/ingredientCatalog.ts`). The `Ingredient`
interface in `src/types/meal.ts` is never imported by anything.

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
`updateSettings` exists in `src/state/store.tsx` but **is never called by anything**. Mostly a form.

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

- **Effort-based weekday weighting.** `effort` is typed (`Meal` in `src/types/meal.ts`) and round-tripped
  (`MealEditor.tsx:102`) but has no UI and nothing reads it. Add the editor control, then weight `quick`
  toward weekdays and `involved` toward weekends in `scoreDinner` (`src/lib/generatePlan.ts:52`).
- **Summed ↔ expanded toggle** on the shopping list (spec §5) — the breakdown is currently permanently
  inline (`src/features/shopping/ShoppingScreen.tsx`).
- **Shopping list for an arbitrary week** — only the next accepted week is reachable today
  (`src/features/shopping/useShopping.ts`).
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

- `pnpm test` and `pnpm typecheck` — both green today (43 tests, 5 files); keep them green.
  Note `test` is `vitest` with no `run` flag, so it watches; use `pnpm vitest run` for a one-shot.
- `pnpm lint` (oxlint).
- `pnpm dev` alongside `pnpm emulators` from Stage 2 onward — never against production data.
  `pnpm test:rules` whenever `firestore.rules` changes; deploy the rules by hand afterwards.
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
