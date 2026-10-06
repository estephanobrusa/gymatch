# Shared Core Package (`@gymatch/core`)

`packages/core` is the single source of truth for pure domain types, utilities, and Zustand
stores that need to be used by **both** `apps/web` and `apps/mobile`. It's a plain TypeScript
workspace package — no bundler magic, just something both apps `import` directly.

The package's own doc comment (`packages/core/index.ts`) says it best:

> `@gymatch/core` — single source of truth for shared domain types, pure
> utilities and Zustand stores, consumed by apps/web (Next.js) and
> apps/mobile (Expo React Native).
>
> Platform-safe: no React/Next/server-only imports. Prisma payload types are
> imported with `import type` only and erased at build time, so this package
> stays compatible with React Native bundlers.

## Why this package exists

It was built specifically to maximize code reuse for the Expo mobile app. Rather than
duplicating domain types and matching logic in both `apps/web` and `apps/mobile` (and having
them silently drift apart), everything that's genuinely platform-independent lives here once.

## The "platform-safe" constraint, explained

This package must never import React, Next.js-specific APIs, or anything marked
`"server-only"`. The reason is simple: React Native's bundler (Metro) cannot resolve
Next.js-only or Node-only modules, so anything imported here has to work in both a browser/Node
environment (web) and a React Native runtime (mobile).

The one subtlety worth calling out: some types in `@gymatch/core` describe shapes that
originate from Prisma query results (e.g. a payload type for a user with included relations).
That's safe *only* because those are imported with `import type { ... }` — TypeScript type-only
imports are erased completely at build time, so there's no actual runtime dependency on
`@prisma/client`. This is why `@gymatch/core` can describe Prisma-shaped data without depending
on Prisma itself at runtime. If you ever change a `import type` to a regular `import` for
something Prisma-related here, you've likely broken the mobile build.

## Structure

```
packages/core/
├── index.ts               # the public API surface — what's actually exported
├── disciplines.ts
├── lib/
│   ├── swipe/
│   ├── chat/
│   ├── events/
│   ├── profile/
│   ├── gym/
│   ├── notifications/
│   ├── routine/
│   └── auth/
└── stores/
```

### `lib/swipe/`
- `types.ts` — `SwipeDirection`, `DiscoveryCard`, `SwipeResult`
- `errors.ts` — `FeatureFlagError`
- `feature-flags.ts` — `isFeatureEnabled`
- `age-filter.ts` — `computeAge`, `passesAgeFilter`

### `lib/chat/`
- `types.ts` — `MatchPreview`, `ChatMessage`, `ConversationPage`

### `lib/events/`
- `types.ts` — `EventInput`, `EventWithRelations`, `EventRsvpWithUser`, `EventFeed`, `EventFilterInput`
- `distance.ts` — `haversineKm`, `isNearGym`
- `labels.ts` — `EVENT_TYPE_LABELS`
- `format.ts` — `formatEventDate`

### `lib/profile/`
- `types.ts` — `ScheduleSlotInput`, `ScheduleSlotWithGym`, `ProfileUser`
- `compatibility.ts` — `isScheduleCompatible`, `ScheduleContext`

### `lib/gym/`
- `types.ts` — `GymSearchResult`

### `lib/notifications/`
- `types.ts` — `NotificationPreview`

### `lib/routine/`
- `templates.ts` — `DAY_KEYS`, `DayKey`, `TemplateName`, `RoutineTemplateMap`
- `utils.ts` — `TEMPLATES`, `getTodayMuscleGroup`, `WeeklyRoutineShape`
- `types.ts` — `RoutineInput`

### `lib/auth/`
- `types.ts` — `FitnessProfileInput`, `ActionResult`

### `disciplines.ts`
- `DISCIPLINE_VALUES`, `DISCIPLINE_LABELS`

### `stores/`
- `swipe.store.ts` — `useSwipeStore`
- `index.ts` — barrel export
- `__tests__/` — store tests

## Cross-app import examples

These are real imports in the codebase today:

- `apps/web/src/lib/swipe/hooks.ts`:
  ```ts
  import { useSwipeStore } from "@gymatch/core";
  ```
- `apps/mobile/src/hooks/use-discovery.ts`:
  ```ts
  import { useSwipeStore } from "@gymatch/core";
  ```
- `apps/mobile/src/lib/api/client.ts` imports several shared types from `@gymatch/core` to type
  the payloads it sends to and receives from the `/api/v1/*` REST API, keeping request/response
  shapes consistent with what the web Server Actions already use.

## When to put something in `packages/core` vs. keep it local

Rule of thumb for a junior: if a type, utility, or store will be needed by **both** web and
mobile — or even just "might be needed soon" by both — put it in `@gymatch/core`. If it's tied
to a specific UI framework (React DOM components on web vs. React Native components on
mobile), keep it local to that app instead. Business logic and data shapes belong here; UI
belongs in the apps.

## Testing

`packages/core` has its own `vitest.config.ts` and 5 test files:

- `lib/routine/utils.test.ts`
- `lib/events/__tests__/distance.test.ts`
- `lib/swipe/feature-flags.test.ts`
- `stores/__tests__/swipe.store.test.ts`
- `lib/swipe/__tests__/age-filter.test.ts`

See [`testing-guide.md`](./testing-guide.md) for how these fit into the overall test strategy
across the monorepo.
