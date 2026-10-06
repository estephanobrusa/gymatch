# Gymatch Documentation

Gymatch is a Tinder-style fitness social app that matches gym partners — swipe, match, chat.
It's built as a pnpm monorepo on top of Next.js 15 (App Router) and Supabase (Postgres, Auth,
Realtime), delivered as a mobile-first PWA, with a React Native (Expo) app currently in
progress alongside it.

This `/docs` folder is the deep architecture reference for the codebase. The root
[`README.md`](../README.md) is the quick-start / product-overview doc — install steps, env
vars, available scripts. The two sets of docs complement each other and intentionally don't
repeat each other: start in the root README to get the app running locally, come here to
understand how it actually works.

## Contents

| File | What's in it | Read first if you're... |
|---|---|---|
| [`architecture-overview.md`](./architecture-overview.md) | The big picture: monorepo layout, why there's no separate backend service, the "two apps, one backend" shape, request lifecycle walkthrough, deployment shape | Anyone — read this first |
| [`backend-data-model.md`](./backend-data-model.md) | Prisma schema, migrations, the data model that everything else is built on | Working on any backend logic or data shape |
| [`backend-server-actions-and-api.md`](./backend-server-actions-and-api.md) | Server actions, the REST API v1 (for mobile), the `ActionResult` convention, feature flags | Writing or changing backend behavior on web or mobile |
| [`backend-auth-realtime-security.md`](./backend-auth-realtime-security.md) | Auth flow, the two-gate pattern, Supabase Realtime, moderation | Touching auth, chat, realtime, or moderation/reporting |
| [`frontend-web-app.md`](./frontend-web-app.md) | Next.js App Router structure, components, state management, PWA | Working in `apps/web` |
| [`shared-core-package.md`](./shared-core-package.md) | `packages/core` (`@gymatch/core`) — shared types, utils, Zustand stores used by both apps | Adding or reusing code shared between web and mobile |
| [`mobile-app.md`](./mobile-app.md) | Expo app structure, what's actually built vs. still scaffolded, mobile-specific gotchas | Working in `apps/mobile` |
| [`testing-guide.md`](./testing-guide.md) | How testing is set up and run across web, mobile, and core; what's covered and what isn't | Before writing or running tests |
| [`conventions-and-gotchas.md`](./conventions-and-gotchas.md) | Flat list of must-know conventions and traps, ordered by how often you'll hit them | Before opening your first PR |
| [`commit-convention.md`](./commit-convention.md) | How to write a commit message (Conventional Commits, enforced by a git hook) and the `pnpm commit` interactive CLI | Before your first commit |
| [`v4.md`](./v4.md) | Pending product roadmap (not architecture — a planning doc, kept separate on purpose) | Only if you need to know what's planned next |

## Suggested reading order for a new developer

1. This README (you're here).
2. [`architecture-overview.md`](./architecture-overview.md) — get the shape of the system.
3. [`backend-data-model.md`](./backend-data-model.md) — understand the data you'll be working with.
4. [`backend-server-actions-and-api.md`](./backend-server-actions-and-api.md) — understand how data gets read and written.
5. [`frontend-web-app.md`](./frontend-web-app.md) or [`mobile-app.md`](./mobile-app.md), depending on which app you'll actually be working in.
6. [`conventions-and-gotchas.md`](./conventions-and-gotchas.md) — read this before your first PR, not after.
7. [`commit-convention.md`](./commit-convention.md) — read this before your first commit; run `pnpm commit` instead of `git commit` and it walks you through it.
8. [`testing-guide.md`](./testing-guide.md) — how to verify your changes.
9. [`shared-core-package.md`](./shared-core-package.md) — once you need to touch code shared between web and mobile.
