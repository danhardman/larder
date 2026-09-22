# Larder

A household meal planner. Once a week you draft seven dinners plus a breakfast and lunch rotation
from your own library of meals, tweak the draft, lock it in, and get a shopping list built from the
plan. Through the week you tick each meal off (or say why you skipped it), and that history feeds
recency rules and portion-size warnings. It runs as an installable PWA behind Google sign-in.

The product spec is `meal-planner-spec.md`. The staged build plan, with what's done and what's next,
is `docs/development-plan.md`. Firebase and Cloudflare setup are in `docs/`.

## Running it

```sh
pnpm install
pnpm emulators      # Firebase auth + Firestore emulators (needs Java); data persists in .emulator/
pnpm dev            # Vite dev server — in dev it talks to the emulators, never production
pnpm seed           # write the starter meal library into the emulator (sign in to the app once first)
pnpm vitest run     # tests, one shot (`pnpm test` watches)
pnpm test:rules     # Firestore security rules test; needs the emulators running
pnpm typecheck      # tsc -b --noEmit
pnpm lint           # oxlint
pnpm build          # tsc -b && vite build
```

Sign-in needs the `VITE_FIREBASE_*` variables in `.env.local` (see `docs/firebase-setup.md`). In the
auth emulator, "Sign in with Google" offers to make up a fake account — any will do.

## Where things live

```
src/
  main.tsx          Providers (auth → gate → store → toast) around <App/>.
  App.tsx           The shell: which tab is showing, which overlay is open, and the
                    hand-offs between features. Composition only — no business logic.
  types/            The persisted domain model, and nothing else.
    meal.ts         Meal, MealIngredient and the classification enums + their lists.
    plan.ts         WeekPlan, Slot, outcomes, skip reasons, portion feedback + labels.
    settings.ts     Household settings and their defaults.
    household.ts    The household document everything lives under (name, memberUids, settings).
  lib/              Pure functions with no React and no IO: the plan generator, the
                    shopping list, stats, seasons, seeded randomness, date helpers. Tests sit
                    beside the modules. Anything that touches a screen, the network or
                    storage does not belong here.
  data/             Static data: the seed library a new household starts with.
  state/            React context providers and their hooks.
    store.tsx       useLarder(): all household data plus the actions that change it,
                    subscribed live to Firestore.
    db.ts           Firestore paths, snapshot → domain mappers, find-or-create household.
    auth.tsx        useAuth(): Firebase sign-in state.
    toast.tsx       useToast(): say('...') shows a transient message.
    firebase.ts     Firebase SDK init: app, auth, Firestore with offline persistence,
                    emulator wiring in dev.
  components/       Shared, feature-agnostic UI: BottomSheet, TabBar, SwipeRow, icons.
                    A component with its own helpers gets a folder (SwipeRow/index.tsx
                    + swipeGesture.ts); the rest are single files.
  features/         One folder per area of the app. Each owns its screen, its hooks,
    auth/           and its sub-components; nothing imports across features except
    weeks/          App.tsx.
    library/
    shopping/
scripts/seed.ts     Writes the seed library into the emulator (Admin SDK; refuses to run elsewhere).
test/rules.test.ts  Security rules test against the emulator.
firestore.rules     The authorization layer: members of a household, and nobody else.
```

## How data flows

`useLarder()` is the single source of truth. It exposes the data (`meals`, `plans`, `ticked`,
`settings`), derived views (`stats`, `usedMealIds`) and the actions (`draftWeek`, `patchSlot`,
`saveMeal`, ...). It is backed by Firestore under `/households/{hid}` with offline persistence on:
three live subscriptions (the household doc, `meals`, `weekPlans`) feed the data, and actions write
straight to documents without awaiting the server — offline, the local snapshot updates at once and
the write syncs later. Screens never import Firestore; the store is the seam (spec §7.4).

`draftWeek` never returns the generated plan. It writes the week plan document, `thin` hint
included, and the Planner reads the result off the plan it is already subscribed to.

Feature hooks sit on top of the store and add what the store shouldn't know about: the wording of
toasts, follow-on UI (the portion prompt after "Ate it"), and screen-local state (search text, which
slot's sheet is open). Screens and components are presentational and take everything as props.

```
lib/ (pure)  ←  state/store.tsx (+ db.ts, firebase.ts)  ←  features/*/use*.ts  ←  features/*/Screen.tsx  ←  App.tsx
```

## Adding things

- **A domain field** goes in `src/types/`. If it needs labels for the UI, put the label table next to
  the enum, as `SKIP_REASONS` does.
- **Logic** that can be expressed as a function of plain data goes in `src/lib/` with a test. Feature
  folders can also hold small pure helpers (`weekCards.ts`, `slotCandidates.ts`) when they're only
  meaningful to that feature; those get tests too.
- **A new screen** is a new folder under `src/features/`, plus a tab in `components/TabBar.tsx` and a
  branch in `App.tsx`. State the screen needs lives in a `use<Feature>.ts` hook in that folder.
- **A shared component** goes in `src/components/` only if two features use it. Otherwise keep it in
  the feature.
- **View-model types** (`WeekView`, `SheetTarget`, `Screen`) live beside the code that owns them, not in
  `src/types/`, which is reserved for what gets persisted.

Conventions: relative imports (no path aliases), `import type` for types (`verbatimModuleSyntax`),
helpers in `.ts` files rather than exported from component files (keeps React fast refresh working),
tests colocated as `<module>.test.ts`.
