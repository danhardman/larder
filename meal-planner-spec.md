# Meal Planner — Project Spec

## 1. Overview

A phone-first app for a household to maintain a library of meals they actually eat, automatically generate a weekly meal plan (breakfast, lunch, dinner) with smart variety and seasonal awareness, and produce a copy-pasteable shopping list. The goal is to remove two recurring chores — deciding what to eat and working out what to buy — and to **reduce food waste** by buying only what's actually planned and tracking what actually gets eaten.

**Users:** You + partner/family (shared data, small trusted user group).
**Platform:** Phone-first PWA (installable to home screen).
**Builder:** You (developer).

## 2. Core user flows

1. **Build meal library** — Add a meal once: name, meal type(s), tags, main ingredients. Edit/archive later.
2. **Generate weekly plan** — One tap produces a full week (7 days × up to 3 slots). Suggestions respect variety and season rules.
3. **Swap a meal** — Tap any slot to re-roll it (respecting constraints) or manually pick from the library.
4. **Get shopping list** — One tap compiles main ingredients for the accepted week into a plain-text list with a "Copy" button.
5. **Track meals** — Each day, tick meals off as eaten. If a meal wasn't eaten, flag why (ate out, takeaway, at a friend's, other). Over time this shows which planned meals actually get cooked and where waste is creeping in.

## 3. Data model

All app data lives under a household document, from day one. Even while there's a single user, scoping this way means the M2 sharing work is "add a second member to the household", not a data migration.

```
/households/{householdId}
    name, memberUids[], settings { recencyWindowWeeks, rotationSize }
  /meals/{mealId}
  /ingredients/{ingredientId}
  /weekPlans/{weekPlanId}
```

Access control is enforced by Firestore security rules: a user may read/write anything under `/households/{hid}/**` only if their auth token's `householdId` matches `hid`. There is no server-side API layer (see §7).

### Meal
Document at `/households/{hid}/meals/{mealId}`.

| Field | Type | Notes |
|---|---|---|
| id | uuid | document id |
| name | string | e.g. "Chicken fajitas" |
| mealTypes | enum[] | breakfast / lunch / dinner (a meal can qualify for multiple) |
| protein | enum | chicken / beef / pork / fish / veg / other / none |
| carbBase | enum | pasta / rice / potato / bread / grain / none |
| seasons | enum[] | spring / summer / autumn / winter (default: all) — used to filter e.g. heavy stews out of summer |
| ingredients | MealIngredient[] | **embedded array**, main ingredients only (see below) |
| effort | enum (optional) | quick / normal / involved — nice-to-have for weekday vs weekend weighting |
| archived | bool | hide without deleting history |
| stats | object (optional) | denormalised rollup: `{ timesCooked, timesTooMuch, timesNotEnough, timesSkipped }` — see below |

**`stats` rollup.** WeekPlan history is the source of truth, but scanning every plan to answer "does this meal usually make too much?" is awkward at exactly the moment it's most useful: while editing the meal's quantities. The rollup is incremented in the same batched write as the tick-off, so the Meal Library and edit screen can show a portion warning without loading history. It's fully recomputable from WeekPlans if it ever drifts — worth writing that recompute script early, it's twenty lines and saves an afternoon later.

### MealIngredient (embedded)
The relational pivot table is flattened into an array on the meal document, so rendering a meal or building a shopping list is a single read rather than a join.

| Field | Type | Notes |
|---|---|---|
| ingredientId | uuid | reference into the ingredient catalog |
| name | string | **denormalised** copy of the ingredient name |
| quantity | number | numeric input, e.g. 500, 2 |
| unit | enum | kg / g / l / ml / piece / pack / tin / bunch / other |

Renaming an ingredient requires a fan-out write across meals that use it — a batched write over a household-sized library, so acceptable.

**No servings model.** A meal is a *recipe* — its ingredient quantities are absolute, sized for the household as it is. There is no servings field and no portion multiplier anywhere in the system; the shopping list sums the numbers as entered. To cook more or less of something, edit the meal's quantities. This keeps the shopping list arithmetic trivial (sum within matching units, no scaling) and reflects the actual purpose: planning cooking and shopping, not portioning.

### Ingredient (catalog)
Document at `/households/{hid}/ingredients/{ingredientId}`. Exists purely to power autocomplete and enforce case-insensitive uniqueness when adding ingredients to a meal.

| Field | Type | Notes |
|---|---|---|
| id | uuid | document id |
| name | string | "chicken thighs" |
| nameLower | string | lowercased, for uniqueness checks + prefix search |

When adding ingredients to a meal, the UI shows a pivot-style row per ingredient: pick/create the ingredient, enter a numeric quantity, choose a unit from the dropdown.

Pantry staples (oil, salt, common spices) are simply **not entered** into the ingredient catalog — per requirements they never appear on the list. No staples flag needed in v1.

### WeekPlan
Document at `/households/{hid}/weekPlans/{weekPlanId}`.

| Field | Type | Notes |
|---|---|---|
| id | uuid | document id |
| weekStart | date | Monday — also used as the sort key for recency queries |
| slots | Slot[] | embedded array: { day, mealType, mealId, mealName, locked, outcome, skipReason, skipNote, portionFeedback } |
| status | enum | draft / accepted |
| seed | number | RNG seed used to generate this plan (see §4) |

`mealName` is denormalised onto the slot so a historical week still renders correctly if the meal is later archived or renamed.

**Slot outcome tracking:**
- `outcome`: enum — pending / eaten / skipped
- `skipReason`: enum (when skipped) — ate_out / takeaway / at_friends / other
- `skipNote`: optional free text
- `portionFeedback`: enum, nullable (only meaningful when `outcome = eaten`) — too_much / about_right / not_enough

**Why `portionFeedback` is a separate field, not a third `outcome` value.** A meal that produced leftovers *was still cooked and eaten* — it belongs in the same bucket as any other eaten meal for "did we cook what we planned" reporting. Making leftovers a peer of `eaten` would mean writing `outcome === 'eaten' || outcome === 'leftovers'` at every call site, and the first time one is forgotten a stat goes quietly wrong. Keeping it orthogonal means the eaten/skipped split stays clean and portion data layers on top.

`null` is the default and means "no feedback given" — deliberately distinct from `about_right`. Most meals will never get a rating, and that's fine.

`not_enough` is included because it's the same class of signal in the opposite direction, and under-catering has its own waste path: it pushes you to a takeaway or a top-up shop.

History of accepted WeekPlans feeds the "avoid recent repeats" logic and, separately, the portion and skip insights.

## 4. Suggestion algorithm

Keep it simple: filter → score → greedy fill → local retry. No need for a full constraint solver at this scale.

**Implementation shape:** the generator is a **pure function** in its own module with no Firebase imports:

```ts
generatePlan(library: Meal[], history: WeekPlan[], season: Season, seed: number): Slot[]
```

The caller loads the library and recent history from Firestore, calls the function, and writes the result back. This keeps the only real logic in the app fast to unit-test against fixture libraries ("thin summer breakfasts", "everything is chicken") without touching the network or the emulator.

**Seeded randomness:** the jitter uses an injected seeded RNG rather than `Math.random()`, and the seed is persisted on the WeekPlan. A baffling plan can then be reproduced exactly for debugging.

**Hard filters (per slot):**
- Meal's `mealTypes` includes the slot type.
- Meal's `seasons` includes the current season, derived from the current month (see below).
- Not archived.
- **Dinners only:** not already used as a dinner this week (no dinner repeats within a week).

**Season derivation:** a single pure function `seasonForMonth(month): Season`, northern-hemisphere mapping hard-coded (Mar–May spring, Jun–Aug summer, Sep–Nov autumn, Dec–Feb winter). No user setting, no manual override. Keeping the mapping isolated in one function means a hemisphere flag could be added later in one place if it ever mattered.

**Outcome data is deliberately not an input to generation.** Slot outcomes, skip reasons and portion feedback are recorded from M1 onward and surfaced read-only in the M3 insights view, but the generator never reads them. No learning, no adaptive weighting, no "Fridays are takeaway night" inference, and no automatic quantity scaling from portion feedback — that stays a human decision made by editing the meal. If any of this changes later it should be an explicit decision, not something that creeps in.

**Breakfast & lunch — repetition by design:** instead of filling each day independently, the generator picks a small rotation (e.g. 1–3 breakfast options, 1–3 lunch options) for the week and repeats them across days. This matches real behavior (bacon sandwiches, cereal, chicken wraps on rotation) and keeps the shop focused on a few key ingredients. Rotation size is a setting; users can still swap any individual slot.

**Soft constraints (scored, per week, applied to dinners only):**
- **Protein variety:** penalize a 3rd+ occurrence of the same protein in the week; small penalty for back-to-back days with the same protein.
- **Carb variety:** same treatment for carbBase (e.g. avoid 3 pasta dinners).
- **Recency:** penalize meals that appeared in the last 2 accepted weeks (tunable window).
- Small random jitter so plans differ week to week.

**Generation:** shuffle candidates, fill slots greedily picking the highest-scoring meal per slot; if a slot has no acceptable candidate, relax the recency penalty first, then variety, and surface a gentle "your library is thin for summer breakfasts"-style hint.

**Swap:** re-run selection for that single slot with the rest of the week held fixed (locked slots never change).

## 5. Shopping list generation

Summed for convenience, but with the per-meal breakdown always visible so you can make sensible buying decisions (e.g. 600g chicken across 2 meals → easier to grab two 300g packs than guess). The total tells you *how much*; the breakdown tells you *how it's split*.

Like the generator, this is a pure function over an accepted WeekPlan plus the meals it references — no Firebase imports, trivially testable.

**Grouping rule:** group by ingredient **and** unit — you can only sum compatible units. `500 g` and `2 piece` of the same ingredient stay as separate lines; `300 g + 300 g` sum to `600 g`. This avoids any unit conversion.

1. Walk every meal slot in the accepted week (a meal repeated N times contributes N times).
2. Collect all embedded MealIngredient entries; group by `(name, unit)`.
3. For each group, sum the quantities and record which meals contributed (with their individual amounts and how many times each occurs).
4. Render one line per group: **total + unit + name**, with a secondary line showing the breakdown by meal.
5. Plain text with a **Copy to clipboard** button.

Example output:
```
Shopping list — w/c 13 Jul

600 g — chicken thighs
   ↳ Chicken fajitas 300g + Katsu curry 300g  (2 packs of 300g?)

8 piece — bacon rashers
   ↳ Bacon sandwich ×4 (2 each)

3 piece — bell peppers
   ↳ Chicken fajitas

...
```
The "(2 packs of 300g?)" style hint is optional sugar — the core requirement is total + a clear per-meal split. Because quantity and unit are structured, both the summed and fully-expanded views are cheap to offer; a toggle between "Summed" and "Expanded" is a reasonable setting.

**Offline note:** the shopping list must work in a supermarket with no signal. Firestore offline persistence covers this — the week and its meals are already in the local cache, and ticking items off syncs when signal returns.

## 6. Screens (v1)

1. **This Week** (home) — the plan grid; tap slot to swap/lock; tick meals off as eaten or mark skipped with a reason (quick-pick: ate out / takeaway / at a friend's / other). Today's meals surfaced at the top. "Regenerate week" and "Shopping list" buttons.
2. **Shopping List** — text list + Copy button.
3. **Meal Library** — searchable list, add/edit meal form (name, types, protein, carb, seasons). Ingredients entered as pivot-style rows: pick/create ingredient, numeric quantity, unit dropdown. Meals carrying a portion warning show an inline hint next to the ingredient rows — that's where the fix actually gets made.
4. **Settings** — recency window, rotation size, household members.

**Portion feedback must not add friction.** On This Week, a tick means eaten and the interaction ends there. Portion rating is a secondary, skippable control revealed after ticking — three icons (too much / about right / not enough) that can be ignored entirely. If rating becomes a mandatory second tap on every meal it will be abandoned within a fortnight and the data will be worthless. Unrated meals stay `null` and are simply excluded from the denominator.

## 7. Architecture (decided)

**PWA + Firebase**, chosen over Flutter: Flutter web produces a heavy canvas-rendered bundle that doesn't feel native in a browser, and Flutter native would mean Xcode signing, provisioning profiles and TestFlight (with 90-day build expiry) just to get the app onto a second phone in the same house. Skipping the App Store entirely is a feature here.

| Concern | Choice |
|---|---|
| Framework | Vite + React + TypeScript |
| PWA shell | `vite-plugin-pwa` (manifest + service worker) |
| Hosting | **Cloudflare Pages** (familiar, git-push deploys). Firebase Hosting not used. |
| Data | Cloud Firestore, **offline persistence enabled** |
| Auth | Firebase Auth — **Google sign-in only**, via `signInWithPopup`. `householdId` custom claim drives security rules. |
| Storage | Firebase Storage (only if meal photos are added later) |
| Local dev | Firebase Emulator Suite + a seed script populating a fake meal library |
| Testing | Vitest against the pure generator / shopping-list modules |

**No backend API and no Cloud Functions in v1.** The React client talks directly to Firestore; security rules are the authorization layer. All logic (generation, scoring, list building) runs on-device. See §7.1.

**Escape hatch:** if native push, widgets or app-store presence are ever wanted, **Capacitor** wraps the same React codebase without a rewrite.

**Out of scope:** push notifications.

### 7.1 Where the logic runs

Firebase is a set of managed services, not a server you deploy application code to. The mental model is:

- **Client → Firestore, directly.** The SDK in the React app reads and writes documents over a websocket. There is no Express app, no REST endpoints, no request handlers to write.
- **Security rules replace the API layer.** The authorization checks that would normally live in route middleware are declared in `firestore.rules` and enforced by Google's infrastructure. This is the part to get right — a permissive rule is the whole security model gone.
- **The generator is just a TypeScript module** in the client bundle. "Pure function" means plain code, not a deployed artifact.

Cloud Functions (Node, deployed to GCP) exist for work that *can't* be trusted to the client — payment processing, secret-holding API calls, reacting to database writes server-side. None of that applies here, and using them would require the paid Blaze plan for outbound network access. Deliberately not used in v1.

### 7.2 Hosting on Cloudflare Pages

Because the app is entirely static and talks to Firebase over the network, hosting is independent of the backend. Firebase Hosting is dropped in favour of Cloudflare Pages.

Setup checklist:

- **Firebase Auth → authorized domains:** add the Pages domain. Sign-in is rejected from unlisted origins.
- **Google Cloud console → API key restrictions:** add the Pages domain to the HTTP referrer allowlist.
- **`_redirects`:** `/* /index.html 200` for SPA deep links.
- **`_headers`:** `Cache-Control: no-cache` on `sw.js`. Cloudflare caches aggressively by default and a cached service worker is the classic stale-build trap.
- **Preview deploys** get hashed subdomains that won't match the authorized-domains list, so auth breaks on previews. Either point previews at the emulator or run a separate Firebase project for staging.

Local development against the Emulator Suite is unaffected — that's SDK config, unrelated to hosting.

### 7.3 Authentication

**Google sign-in via `signInWithPopup`.** Locked in for v1.

- `authDomain` stays as the default `<project>.firebaseapp.com` — no proxy or `authDomain` change needed for the popup flow.
- `signInWithPopup` must be called directly in the click handler with no preceding `await`, or Safari's popup blocker will kill it.
- Session persists to IndexedDB indefinitely: one sign-in per device, forever.

**Known risk — verify with a spike before building anything else.** Popup OAuth from an *installed* iOS home-screen PWA served from a non-Firebase origin is the historically problematic combination; the popup passes its result back via web storage, and standalone home-screen apps don't share storage with the system browser that opens the popup. Reports of this are several years old and iOS has changed considerably, so it may now simply work.

*Spike:* blank Vite page, one "Sign in with Google" button, deploy to Pages, add to home screen, test on the actual phone. Mobile Safari alone won't reveal it — installed standalone mode is the failing case.

*If it fails:* add a Cloudflare Pages Function transparently forwarding `/__/auth/*` to `<project>.firebaseapp.com/__/auth/*` (not a 302), then switch to `signInWithRedirect`.

**Apple sign-in: rejected for v1.** Sign in with Apple for web requires a Services ID and signing key from the Apple Developer Program (~£79/yr) — not justifiable for a two-person app. Revisit only if the Capacitor route is ever taken, where App Store rules would require it.

## 8. Milestones

**M0 — Auth spike (half a day):** prove Google `signInWithPopup` works from an installed iOS home-screen PWA on Cloudflare Pages (§7.3). Determines whether auth is three lines or needs a Pages Function proxy. Do this before writing app code.
**M1 — Usable core:** project scaffold, emulator + seed script, household-scoped Firestore schema and security rules, meal CRUD, week generation with variety + season rules, swap, text shopping list, tick-off tracking with skip reasons and portion feedback. Capture lands in M1 even though the insights view is M3 — the data has to accumulate for months before it says anything useful, so recording it late is recording it never. Single member, but the household structure is already in place.
**M2 — Shared:** Firebase Auth, `householdId` custom claim, invite/join a second member, plan history feeding recency rules.
**M3 — Polish & insights:** locked slots, effort-based weekday weighting, ingredient grouping, and a simple **waste insights view** — read-only reporting over accumulated outcome data:

- **Portion warnings:** meals rated `too_much` on a majority of rated cooks, with a minimum threshold of 3 rated cooks before anything is surfaced. Below that, one heavy night would trigger bad advice. Presented as "Chicken fajitas — too much 4 of 5 times. Consider reducing quantities," linking straight to the meal edit screen.
- **Skip patterns:** which meals get planned but never cooked, which days of the week reliably get skipped, and the breakdown of skip reasons.

Purely informational. It changes your quantities and your buying habits; it never changes the algorithm.

## 9. Decisions log

No open questions remain for v1.

| Decision | Resolution |
|---|---|
| Breakfast/lunch repetition | Repeat by design via a weekly rotation of 1–3 options |
| Dinner repetition | Hard constraint: never repeats within a week |
| Leftovers (planning) | Out of scope — the app never plans a slot as "eat yesterday's leftovers" |
| Leftovers (recording) | In scope — `portionFeedback` on each eaten slot flags over- and under-catering, driving manual quantity edits |
| Servings/portions | No servings model. Meals are recipes with absolute quantities; edit quantities to change amounts |
| Season source | Month-based, northern hemisphere hard-coded. No setting, no manual override |
| Skip data in generation | Recorded and reported, never fed back into the generator |
| Framework | Vite + React + TypeScript PWA |
| Hosting | Cloudflare Pages |
| Backend | Firebase — Firestore + Auth, no Cloud Functions, no server-side code |
| Auth | Google sign-in only, `signInWithPopup`. Apple rejected on cost |
| Notifications | Out of scope |

**Deferred, not rejected:** effort-based weekday weighting (M3), ingredient photo storage, Capacitor wrapper for native features. Adaptive generation from outcome history remains off the table pending an explicit future decision.
