# Gymatch

Tinder-style fitness social app: match with gym partners who train near you, at your schedule, with your goals. Next.js 15 monorepo on Supabase (Postgres + Auth + Realtime), built mobile-first as a PWA.

> **Status**: V2 + V2.1 + V2.4 A/B/D/E complete · **V4 in progress** — see [docs/v4.md](docs/v4.md) for the full pending roadmap.

---

## Product vision

Gymatch connects people looking for compatible training partners based on location, gym, fitness goals, and schedule. The core loop is swipe → match → chat, focused exclusively on fitness and workout accountability:

- find gym partners
- train together
- improve consistency
- socialize inside fitness

**MVP goal**: validate whether users will adopt a social fitness app for these use cases.

**Monetization groundwork** (feature-flagged from day one, all free initially): Super Likes, Rewind, unlimited likes, Boost visibility, and "see who liked you" — enabled later via `NEXT_PUBLIC_FEATURE_*` flags.

---

## Quick start

```bash
# 1. Install (pnpm ≥ 11, Node ≥ 22)
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
| `packages/eslint-config/` | `@gymatch/eslint-config` | ESLint 9 flat config (`next` / `react` / `base`) |
| `docs/` | — | Product specs: v4.md (pending roadmap) |

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

### Why Supabase (not Strapi)

Strapi was explicitly rejected: unnecessary complexity, weak fit for realtime social apps, inefficient for swipe/match/chat, and too CMS-oriented. Supabase provides Postgres, Auth, Realtime, Storage, and Row Level Security in one platform, plus Next.js Route Handlers / Server Actions for the API layer.

### Why Postgres (not SQLite)

SQLite is off the table: dangerous behavioral differences with Postgres, partial support for advanced features, and inconsistent realtime/testing. Local dev uses Postgres via Docker; production uses Supabase Postgres.

### Mobile strategy

**Phase 1**: Next.js PWA. **Phase 2**: React Native (Expo). Validate the product first, then reuse the backend logic.

### Supply-chain security

pnpm 11 with hardened defaults configured explicitly in [`pnpm-workspace.yaml`](pnpm-workspace.yaml): `minimumReleaseAge: 1440` (blocks deps published < 1 day) with `minimumReleaseAgeStrict: true` (prompt instead of silent exclusion), `blockExoticSubdeps`, `strictDepBuilds`, and `verifyDepsBeforeRun: install`. Dependency `postinstall` scripts run only after explicit approval via `allowBuilds`.

---

## Environment variables

All in `apps/web/.env.local` (root `.env.example` documents them).

| Variable | Used by | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | middleware, supabase client/server | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | middleware, supabase client/server | public |
| `DATABASE_URL` | Prisma runtime | Supabase pooler (`:6543`) |
| `DIRECT_URL` | Prisma migrations + seed | direct connection (`:5432`); bypasses the pooler |
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
- **Testing**: 48 Vitest files (432 unit/integration tests, RTL); `// @vitest-environment jsdom` opt-in per component test; Playwright mobile-first (390×844), 3 projects, auth storage state.

---

## Deployment & CI/CD

**Target**: Docker image on a VPS managed with Dockploy (Docker Compose), reverse proxy nginx/caddy. The app ships as a standalone Next.js build (`output: "standalone"` in `next.config.ts`).

**GitHub Actions** (all use the automatic `GITHUB_TOKEN`, no manual secrets):

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `.github/workflows/ci.yml` | push/PR to `main` + `release` | install → `prisma generate` → lint → typecheck → vitest |
| `.github/workflows/release.yml` | `workflow_dispatch` (`rc` / `stable`) | semver bump (root `package.json`), git tag, GitHub Release — RC as prerelease (`vX.Y.Z-rc.N`), stable as full release (`vX.Y.Z`) |
| `.github/workflows/docker-image.yml` | push tag `v*` / manual | build + push image to `ghcr.io/<owner>/gymatch` (tag + `latest` for stables) |

Version bumps come from `scripts/release-version.mjs` (auto-next patch or rc cycle, explicit semver allowed).

---

## Product roadmap (docs/)

Everything shipped is listed here. Everything pending lives in [`docs/v4.md`](docs/v4.md).

| Scope | Status |
|-------|--------|
| MVP: auth (Google OAuth), onboarding, profiles, photos, swipe, match, realtime chat, report/block | ✅ done |
| Design system, back nav, seed, gym search, profile edit, onboarding fitness+routine | ✅ done |
| Block, report, unmatch, delete account, in-app notifications | ✅ done |
| Age range filter, 6 photos, weekly training schedule, schedule compatibility badge | ✅ done |
| Events (creation, RSVP, filtering, Your events), extended event types + disciplines | ✅ done |
| SEO baseline (robots.txt, sitemap, metadata, JSON-LD) | ✅ done |
| Push notifications, profile verification, gym pages, security suite, gym verification, monetization, community | 🔲 [`docs/v4.md`](docs/v4.md) |

---

## Product decisions & rationale

- **Don't over-engineer**: no microservices, no Kubernetes, no complex event buses, no custom websocket infra. With ~1000 users a simple architecture wins.
- **Matching stays simple**: distance + gym + goals. No AI, no complex scoring, no advanced recommendations initially.
- **Moderation early**: social apps die fast without moderation — report/block is in the MVP (categories: fake profile, harassment, sexual content, spam, underage, offensive behavior). Blocking removes the match, chat, and profile, and prevents rematching.
- **GDPR baseline**: account deletion, associated chats and photos deletion; data export deferred.
- **Push notifications** (prepared from MVP): new match, new message; Super Like/Boost later.
- **Costs at MVP**: Supabase free/pro tier + VPS €10–20/mo + Google Places (low) + domain ~€10/yr ≈ €20–50/mo.

---

## Known quirks

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

---

## Implementation decisions (auto-documented)

### Auth (SDD change: auth)

- **Google OAuth** via Supabase Auth + `@supabase/ssr`
- **`ADMIN_DATABASE_URL`**: port 5432 direct (bypasses RLS for `syncUser` via Prisma service role)
- **Split gate pattern**: `middleware.ts` = auth gate (Edge), `(protected)/layout.tsx` = onboarding gate (Node.js)
- **Onboarding complete** = username + birthDate + at least 1 photo
- **Storage bucket**: `profile-photos`, public URLs (MVP)
- **Photo constraints**: max 5 MB, jpeg/png/webp
- **Username**: 3–30 chars, alphanumeric + underscores
- **Age minimum**: 18
- **No Zustand auth store** (deferred — server-first approach)
- **Server Actions** for onboarding mutations (no API routes)