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
pnpm dev            # Vite dev server
pnpm vitest run     # tests, one shot (`pnpm test` watches)
pnpm typecheck      # tsc -b --noEmit
pnpm lint           # oxlint
pnpm build          # tsc -b && vite build
```

Sign-in needs the `VITE_FIREBASE_*` variables in `.env.local` (see `docs/firebase-setup.md`).

## Where things live

```
src/
  main.tsx          Providers (auth → gate → store → toast) around <App/>.
  App.tsx           The shell: which tab is showing, which overlay is open, and the
                    hand-offs between features. Composition only — no business logic.
  types/            The persisted domain model, and nothing else.
    meal.ts         Meal, MealIngredient and the classification enums + their lists.
    plan.ts         WeekPlan, Slot, outcomes, skip reasons, portion feedback + labels.
    settings.ts     Household settings.
  lib/              Pure functions with no React and no IO: the plan generator, the
                    shopping list, stats, seasons, seeded randomness, date helpers. Tests sit
                    beside the modules. Anything that touches a screen, the network or
                    storage does not belong here.
  data/             Static data: the seed library a new household starts with.
  state/            React context providers and their hooks.
    store.tsx       useLarder(): all persisted data plus the actions that change it.
    auth.tsx        useAuth(): Firebase sign-in state.
    toast.tsx       useToast(): say('...') shows a transient message.
    storage.ts      localStorage adapter behind the store (Firestore from Stage 2).
    firebase.ts     Firebase SDK init; the backend the state layer talks to.
  components/       Shared, feature-agnostic UI: BottomSheet, TabBar, SwipeRow, icons.
                    A component with its own helpers gets a folder (SwipeRow/index.tsx
                    + swipeGesture.ts); the rest are single files.
  features/         One folder per area of the app. Each owns its screen, its hooks,
    auth/           and its sub-components; nothing imports across features except
    weeks/          App.tsx.
    library/
    shopping/
```

## How data flows

`useLarder()` is the single source of truth. It exposes the data (`meals`, `plans`, `ticked`,
`settings`), derived views (`stats`, `usedMealIds`) and the actions (`draftWeek`, `patchSlot`,
`saveMeal`, ...). Today it persists to localStorage; Stage 2 moves it to Firestore behind the same
interface.

Feature hooks sit on top of the store and add what the store shouldn't know about: the wording of
toasts, follow-on UI (the portion prompt after "Ate it"), and screen-local state (search text, which
slot's sheet is open). Screens and components are presentational and take everything as props.

```
lib/ (pure)  ←  state/store.tsx (+ storage)  ←  features/*/use*.ts  ←  features/*/Screen.tsx  ←  App.tsx
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
