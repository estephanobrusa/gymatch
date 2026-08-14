# Gymatch

Tinder-style fitness social app: match with gym partners who train near you, at your schedule, with your goals. Next.js 15 monorepo on Supabase (Postgres + Auth + Realtime), built mobile-first as a PWA.

> **Status**: V2 + V2.1 + V2.4 A/B/D/E complete · **V4 in progress** — see [docs/v4.md](docs/v4.md) for the full pending roadmap.

---

## Quick start

```bash
# 1. Install (pnpm ≥ 9, Node ≥ 20)
pnpm install

# 2. Configure environment
cp .env.example apps/web/.env.local
#    → fill NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / DATABASE_URL / DIRECT_URL / ADMIN_DATABASE_URL

# 3. Push schema to your Supabase DB
pnpm --filter @gymatch/db db:generate
pnpm --filter @gymatch/db db:push

# 4. Seed development data (~20 users, 5 BA gyms, matches + conversations)
pnpm --filter @gymatch/db db:seed

# 5. Run the app
pnpm dev          # http://localhost:3000
```

Verify it works: log in (seed users use email/password), swipe right a few times, open the Matches tab, open a conversation.

---

## Monorepo layout

| Path | Package | Purpose |
|------|---------|---------|
| `apps/web/` | — | Next.js 15 App Router app (PWA), the only app |
| `packages/db/` | `@gymatch/db` | Prisma schema, migrations, seed script |
| `packages/config/` | `@gymatch/config` | Shared `tsconfig.base.json` + Tailwind base config |
| `packages/types/` | `@gymatch/types` | Shared TypeScript types |
| `packages/eslint-config/` | `@gymatch/eslint-config` | ESLint 9 flat config (`next` / `react` / `base`) |
| `docs/` | — | Product specs: v4.md (pending roadmap) |
| `docker-compose.yml` | — | Local Postgres 16 (matches `DIRECT_URL`) |

---

## Stack

| Area | Choice |
|------|--------|
| Framework | Next.js 15 (App Router, React 19) |
| Backend | Supabase — Postgres, Auth (SSR cookies), Realtime (`postgres_changes`) |
| ORM | Prisma 5 (`@gymatch/db`), admin client bypasses RLS via `ADMIN_DATABASE_URL` |
| PWA | serwist (`src/sw.ts` → `public/sw.js`), manifest at `public/manifest.json` |
| State | TanStack Query (server state) + zustand (swipe store) + immer |
| UI | Tailwind 3 (shadcn tokens, CSS variables), Radix primitives, lucide-react icons, sonner toasts |
| Forms/validation | zod 4 |
| Testing | Vitest 4 (unit/integration, RTL + jsdom), Playwright (mobile-first e2e) |

---

## Environment variables

All in `apps/web/.env.local` (root `.env.example` documents them).

| Variable | Used by | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | middleware, supabase client/server | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | middleware, supabase client/server | public |
| `DATABASE_URL` | Prisma runtime | Supabase pooler (`:6543`) |
| `DIRECT_URL` | Prisma migrations + seed | direct connection (`:5432`); local Postgres via docker-compose |
| `ADMIN_DATABASE_URL` | `lib/auth/admin.ts` admin client | bypasses RLS for server actions |
| `GOOGLE_PLACES_API_KEY` | gym search server actions | needed for GymSearch UI |
| `NEXT_PUBLIC_FEATURE_SUPER_LIKE` / `_REWIND` / `_UNLIMITED_LIKES` | swipe feature flags | V3 groundwork; enable only with exactly `"true"` |
| `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` | Playwright auth setup | e2e only |

---

## Scripts

Run from the root or the app folder (`pnpm --filter apps/web <script>`).

| Command | Action |
|---------|--------|
| `pnpm dev` | Start Next.js dev server (localhost:3000) |
| `pnpm build` / `start` | Production build / serve |
| `pnpm test` | Vitest run (all unit/integration tests) |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm e2e` / `e2e:ui` | Playwright e2e / UI mode |
| `pnpm lint` | ESLint (all packages) |
| `pnpm typecheck` | `tsc --noEmit` (all packages) |
| `pnpm --filter @gymatch/db db:migrate` | Prisma migrate dev |
| `pnpm --filter @gymatch/db db:seed` | Seed dev data (reads `DIRECT_URL` from `apps/web/.env.local`) |
| `pnpm --filter @gymatch/db db:studio` | Prisma Studio |

---

## Data model (packages/db)

Core entities (all mapped to snake_case tables):

- **User** — Supabase auth link (`supabaseId`), profile (bio, photos, gym, disciplines, goals, schedule, experience), onboarding versioning
- **UserPhoto** — up to 6, reorderable, keeps `storagePath` for deletion
- **Gym** — Google Places data (`googlePlaceId`, lat/lng)
- **Swipe** — LIKE/PASS per directed pair (unique `fromId_toId`)
- **Match** / **Conversation** / **Message** — mutual like → conversation (cascade delete on unmatch)
- **Report** / **Block** — trust & safety rows (unique pairs)
- **Notification** — NEW_MATCH / NEW_MESSAGE, unread tracking
- **WeeklyRoutine** — per-day muscle group plan

Migrations (`prisma/migrations/`) track the evolution from init → auth → profile → report/block → gym specialization → storage path → read receipts → notifications → schedule slots → events → disciplines + event types.

---

## Architecture notes

- **Auth split**: `middleware.ts` (Edge) only refreshes Supabase session + redirects to `/login`; the real auth **and onboarding gate** live in `app/(protected)/layout.tsx` (Node runtime) because Prisma cannot run on Edge.
- **Server actions over API routes**: mutations are server actions returning `ActionResult = { success: true } | { error: string }`; the client shows toasts instead of redirecting.
- **Realtime**: `ChatWindow` subscribes to DELETE on `matches` + INSERT on `blocks` (leaves the chat when the match is removed remotely); `NotificationBell` subscribes to `notifications` with a 60s polling fallback.
  - ⚠️ **Gotcha**: Realtime tables must be added to the `supabase_realtime` publication in the hosted DB (`ALTER PUBLICATION supabase_realtime ADD TABLE <name>;`) — unit tests mock the client and never catch a missing publication.
- **Feature flags**: `NEXT_PUBLIC_FEATURE_*` env vars gate V3 mechanics (Super Like, Rewind, unlimited likes).
- **Testing**: 39 Vitest files (unit + integration, RTL); `// @vitest-environment jsdom` opt-in per component test; Playwright mobile-first (390×844), 3 projects, auth storage state.

---

## Product roadmap (docs/)

Everything shipped is listed here. Everything pending lives in [`docs/v4.md`](docs/v4.md).

| Scope | Status |
|-------|--------|
| Design system, back nav, seed, gym search, profile edit, onboarding fitness+routine | ✅ done |
| Block, report, unmatch, delete account, in-app notifications | ✅ done |
| Age range filter, 6 photos, weekly training schedule, schedule compatibility badge | ✅ done |
| Events (creation, RSVP, filtering, Your events), extended event types + disciplines | ✅ done |
| SEO baseline (robots.txt, sitemap, metadata, JSON-LD) | ✅ done |
| Push notifications, profile verification, gym pages, security suite, gym verification, monetization, community | 🔲 [`docs/v4.md`](docs/v4.md) |

---

## Known quirks

- **Git repo root is the home directory** (`/Users/brusae`), not this folder — no `.git` inside `gymatchs/`. Commit paths are relative to home (e.g. `gymatchs/apps/web/...`), and the tracked remote is a personal home-dir repo, not a Gymatch-specific one.
- `packages/db/prisma.config.ts` imports `@prisma/adapter-pg` / `pg` without declaring them — schema migrations work via `directUrl`, but that config path can fail in isolation.
- PWA manifest `theme_color` updated to coral `#f43f5e`; icon files (`icon-192.png`, `icon-512.png`) still missing from `public/` — PWA install will show a blank icon until they are added.
- `GOOGLE_PLACES_API_KEY` is not set in dev, so GymSearch UI returns no results until it is.

## Pending (non-feature)

- **OG image** — `apps/web/public/og-image.png` is missing. Add a 1200×630 PNG there; it is already referenced in the SEO metadata. Without it, social shares show no preview image.
- **Favicon + app icons** — the following files are missing from `apps/web/public/`. The metadata and manifest already reference them; just drop the files in:
  - `favicon.ico` — browser tab icon (all browsers)
  - `icon.png` — 32×32 px PNG
  - `apple-icon.png` — 180×180 px PNG (iOS "Add to Home Screen")
  - `icon-192.png` — 192×192 px PNG (PWA)
  - `icon-512.png` — 512×512 px PNG (PWA splash screen)
  
  Easiest workflow: export a 512×512 PNG of the logo → run it through [realfavicongenerator.net](https://realfavicongenerator.net) → copy the output files here.
# gymatch
# gymatch
