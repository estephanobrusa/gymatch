# Architecture Overview

This is the big-picture doc. Read it before diving into any single part of the codebase — it
exists so you understand the *shape* of the system first, and only then start reading code.

## Monorepo layout

Gymatch is a single pnpm workspace with this layout:

- **`apps/web`** — Next.js 15, App Router. This is both the "backend" (via Server Actions and
  Route Handlers backed by Prisma) and the "frontend" UI. Because Next.js is a full-stack
  framework, there's no separate backend service here — it's one app.
- **`apps/mobile`** — Expo / React Native app. Consumes the same backend as web, but through a
  REST API instead of Server Actions (see below for why).
- **`packages/db`** (`@gymatch/db`) — Prisma schema, migrations, and seed scripts. The single
  source of truth for the data model. See
  [`backend-data-model.md`](./backend-data-model.md).
- **`packages/core`** (`@gymatch/core`) — shared, platform-safe domain types, utilities, and
  Zustand stores, imported directly by both `apps/web` and `apps/mobile` as a regular workspace
  package (no network call involved). See [`shared-core-package.md`](./shared-core-package.md).
- **`packages/config`** — shared base `tsconfig.json` / Tailwind config.
- **`packages/eslint-config`** — shared ESLint flat configs.

**Correcting a gap in the root README**: the root [`README.md`](../README.md)'s monorepo table
is stale — it only lists `apps/web` and `packages/db`, omitting `apps/mobile` and
`packages/core` even though both exist, are fully wired into the workspace, and are actively
developed. Trust this document over that table for the current scope of the repo.

## Why there's no separate backend service

Next.js Server Actions and Route Handlers *are* the backend. Supabase provides Postgres, Auth,
Realtime, and Storage as managed infrastructure on top. This is a deliberate choice to avoid
over-engineering at the current scale: no microservices, no Kubernetes, no separate API
service to deploy and version independently. The root README explains this rationale directly
— the short version is that a simple, boring architecture wins when the team and the traffic
are both small. Don't read "no backend service" as "no backend" — the business logic is just
as real, it lives inside `apps/web`.

## The "two apps, one backend" architecture

Web talks to the backend via **Server Actions**, which are a Next.js-only RPC mechanism (no
separate HTTP route needed, the framework wires the call up for you). Mobile can't use Server
Actions — they only work from within a Next.js app — so the same business logic is *also*
exposed via a versioned REST API (`/api/v1/*`) that the Expo app calls with Bearer token auth.

```
apps/web (UI)    ──Server Actions──┐
                                     ├──> service.ts (business logic) ──> Prisma (prismaAdmin) ──> Postgres (Supabase)
apps/mobile (UI) ──REST /api/v1────┘
```

Crucially, both callers converge on the same `service.ts` business logic functions — the
Server Action and the REST route handler are thin wrappers around shared service code, not two
separate implementations of the same feature. Full details on this convention live in
[`backend-server-actions-and-api.md`](./backend-server-actions-and-api.md).

Both app UIs also import shared types, utilities, and Zustand stores directly from
`@gymatch/core` — that's a plain workspace package import, not a network call, so it bypasses
this whole diagram entirely.

## Request lifecycle walkthrough: recording a swipe and detecting a match

To make the dual-surface architecture concrete, here's one real feature traced end to end.

**On web**: a user swipes on a `DiscoveryCard` component. The swipe gesture calls a client
action wired to a Server Action (e.g. something like `recordSwipe(...)`). The Server Action
runs on the server, calls into the shared `service.ts` swipe logic, which uses `prismaAdmin` to
write the swipe row and check whether the other user already swiped right — if so, it creates
a `Match` row inside the same transaction. The result (`ActionResult`-shaped) is returned to
the client, which updates the `swipe.store.ts` Zustand store and shows a match screen if one
was created.

**On mobile**: the same swipe gesture instead calls `POST /api/v1/swipes` (or equivalent) with
a Bearer token. The route handler authenticates the request, then calls the *exact same*
`service.ts` function used by the web Server Action. The response is JSON instead of a Server
Action result, but the business logic — including the match-detection transaction — is
identical code, not a reimplementation.

This is the pattern to internalize: UI layer differs per app, business logic layer doesn't.
For the full mechanics (transaction shape, match ordering invariant, feature flags gating
swipe behavior), see [`backend-server-actions-and-api.md`](./backend-server-actions-and-api.md)
and [`backend-data-model.md`](./backend-data-model.md).

## Why Supabase, why Postgres, why not Strapi, why not SQLite

Briefly, to orient you — the root README has the full rationale:

- **Postgres over SQLite**: real concurrent writes, proper relational integrity, and room to
  grow; SQLite doesn't fit a multi-user social app with concurrent writers.
- **Supabase over self-hosted Postgres**: managed Auth, Realtime, and Storage bundled with the
  database, instead of standing up and operating each of those separately.
- **No Strapi / headless CMS**: the data model here is relational and highly bespoke (matches,
  swipes, schedules, routines) — a generic CMS content model doesn't fit this domain and would
  add an abstraction layer with no payoff.

## Deployment shape

Production runs as a Docker image on a VPS, orchestrated with Dockploy/Compose, sitting behind
a reverse proxy, built as a Next.js standalone output. See the root README for the CI/CD table.
**Note**: an automated scan during this doc's preparation did not find a `.github/workflows`
directory in the repo — this doesn't necessarily mean CI doesn't exist (it may live elsewhere
or not yet be committed), but treat the README's CI/CD table as something to verify is still
current rather than assume is accurate.

## Mobile phase status

The root README describes the mobile app under a "Phase 2 — future" heading. That's outdated:
the Expo app already has a working Discovery → Match → Chat core loop implemented, not just
planned. Treat mobile as **actively in progress**, not purely future work — though several
screens beyond the core loop are still scaffold-only. See
[`mobile-app.md`](./mobile-app.md) for exactly what's built vs. what's still a stub.
