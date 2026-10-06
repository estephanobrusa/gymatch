# Conventions and Gotchas

A flat, scannable list of must-know conventions and traps, roughly ordered by how often a
newcomer runs into them. Read this before opening your first PR.

## 1. The `ActionResult` convention

Mutating Server Actions that don't navigate away return
`{ success: true } | { error: string }` — the `ActionResult` type. Linear flows that are
expected to move the user forward (like onboarding steps) instead use `redirect()` and throw a
plain `Error` on failure. Don't mix the two patterns in the same action: an action either
returns an `ActionResult` for the caller to branch on, or it redirects/throws, not both. See
[`backend-server-actions-and-api.md`](./backend-server-actions-and-api.md).

## 2. Two gates, two runtimes

The Edge `middleware.ts` only checks whether a session *exists* — no DB access, no Prisma,
because Prisma cannot run in the Edge runtime. All business-rule redirects (e.g. a banned user,
or a user who hasn't finished onboarding) live in `(protected)/layout.tsx`, which runs in the
Node.js runtime and can talk to the database. If you're adding a new protected business rule,
it belongs in the layout — never in middleware. See
[`backend-auth-realtime-security.md`](./backend-auth-realtime-security.md).

## 3. `getUser()`, not `getSession()`

Used in at least 3 places (`middleware.ts`, `lib/auth/index.ts`, `lib/api/auth.ts`) and always
on purpose: `getSession()` trusts whatever is in the cookie without re-validating the JWT,
while `getUser()` re-validates against Supabase on every call. Default to `getUser()` for
anything security-sensitive — treat `getSession()` as the exception that needs justification,
not the default.

## 4. No RLS-respecting Prisma client exists

`prismaAdmin` (connected via `ADMIN_DATABASE_URL`) bypasses Postgres Row Level Security
entirely, and almost every server action and service function uses it. There is no separate
"respects RLS" client in day-to-day use. That means authorization is entirely manual, inside
service functions — don't assume the database is enforcing access control for you just because
RLS policies exist in the schema. See [`backend-data-model.md`](./backend-data-model.md).

## 5. Realtime requires a manual Supabase publication step

A table that hasn't been added to the `supabase_realtime` publication will subscribe
*successfully* and never throw an error — it will simply never fire events, silently. Unit
tests mock the Supabase client, so they will never catch this. If realtime "isn't working" in a
fresh Supabase project, check the publication configuration first, before debugging your
subscription code. See [`backend-auth-realtime-security.md`](./backend-auth-realtime-security.md).

## 6. Dual API surface, one backend

Server Actions (used by web) and the `/api/v1/*` REST routes (used by mobile) both call into
the same `service.ts` functions. If you're fixing a bug, figure out first whether the fix
belongs in the shared `service.ts` layer, or is actually specific to just one of the two
callers — fixing it in the wrong place means the other surface stays broken. See
[`architecture-overview.md`](./architecture-overview.md) and
[`backend-server-actions-and-api.md`](./backend-server-actions-and-api.md).

## 7. Match ordering invariant

`Match.userAId` is always the lexicographically smaller of the two user ids involved in a
match. This is exactly what makes the `@@unique([userAId, userBId])` constraint work regardless
of which user swiped right first — without this ordering rule, the same pair could match twice
under two different orderings. Any new match-creation code must preserve this ordering, or the
unique constraint stops doing its job. See
[`backend-server-actions-and-api.md`](./backend-server-actions-and-api.md).

## 8. Moderation side effects are intentionally chained

Reporting someone automatically unmatches them — and captures the last 20 messages as evidence
*before* the cascade delete destroys the conversation, specifically so there's something to
review. Banning someone automatically deletes any pending appeal, to prevent a stale `ACCEPTED`
appeal from masking a brand new ban. These aren't incidental side effects; they're deliberate
and chained on purpose — don't "simplify" them away without understanding why they're there.
See [`backend-server-actions-and-api.md`](./backend-server-actions-and-api.md).

## 9. Feature flag prefix mismatch (known bug)

`isFeatureEnabled` defaults to reading a `NEXT_PUBLIC_`-prefixed environment variable. Mobile
code must pass `"EXPO_PUBLIC_"` explicitly, or it silently reads the wrong (likely undefined)
env var. This is confirmed broken today for the REWIND flag on mobile. Don't copy this mistake
for any new flag — always pass the correct prefix explicitly on mobile. See
[`mobile-app.md`](./mobile-app.md).

## 10. Immer + Zustand proxy-revocation gotcha

In `swipe.store.ts`, draft proxies created by Immer inside a recipe function are revoked the
instant that recipe function returns. If you need to keep a value derived from the draft after
the recipe ends, capture it with Immer's `current()` *before* the recipe returns — not after.
Reading a revoked proxy later throws or silently returns garbage depending on the engine. See
[`frontend-web-app.md`](./frontend-web-app.md).

## 11. How to make a commit

Commit messages are enforced via a git hook (`.husky/commit-msg` + commitlint) — a message that
doesn't follow [Conventional Commits](https://www.conventionalcommits.org/) gets rejected. Run
`pnpm commit` instead of `git commit` and it prompts you for type, scope, description, body, and
breaking changes step by step, building a valid message for you. Plain `git commit -m "..."`
still works if you already know the format — see [`commit-convention.md`](./commit-convention.md)
for the full type list and examples.

## 12. Known environment gaps

Carried forward from the README's own "Known quirks" and "Pending" sections, since you'll hit
these in local dev regardless:

- `packages/db/prisma.config.ts` references `@prisma/adapter-pg` and `pg`, which are not
  declared as dependencies anywhere in the workspace.
- Several PWA icon and Open Graph image files referenced by the app are missing from
  `apps/web/public/`.
- `GOOGLE_PLACES_API_KEY` is unset in local dev, so gym search returns no results locally — this
  is expected, not a bug in your setup.
