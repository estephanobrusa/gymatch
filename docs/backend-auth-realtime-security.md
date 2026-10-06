# Backend Auth, Realtime, and Security

This document covers how authentication actually flows through the app, why
there are two separate "gates" protecting routes (and why that split is not
negotiable), the full moderation lifecycle, and how Supabase Realtime is
wired up — including a gotcha that will NOT show up in any test suite.

## Auth flow end-to-end

1. **Sign-in**: the user clicks "Sign in with Google". This is handled by
   Supabase Auth (Google OAuth provider), via the `@supabase/ssr` client
   (`apps/web/src/lib/supabase/server.ts` for server-side, `client.ts` for
   the browser). Gymatch never sees the user's Google password — Supabase
   handles the OAuth dance entirely.
2. **Callback** (`apps/web/src/app/auth/callback/route.ts`): Google redirects
   back to `/auth/callback?code=...`. The handler:
   - Exchanges the `code` for a session
     (`supabase.auth.exchangeCodeForSession(code)`), which sets Supabase's
     auth cookies on the response.
   - Checks the waitlist gate (`isWaitlistActive()`) — if active, brand-new
     signups are captured into `WaitlistEntry` and redirected to `/waitlist`
     instead of being admitted.
   - Calls **`syncUser(supabaseUser)`** (`lib/auth/index.ts`), which does
     `prismaAdmin.user.upsert({ where: { supabaseId }, create: {...} })`.
     This is the **only** place a brand-new `User` row is created. It must
     use `prismaAdmin` (bypassing RLS) because at this exact moment the
     user's Prisma row does not exist yet — there is nothing for an
     RLS-respecting query to even match against, and no session context to
     check against anyway, since this *is* the moment of establishing that
     row.
   - Checks ban status, then onboarding status (`getOnboardingStatus`), and
     redirects accordingly (`/banned`, first incomplete onboarding step, or
     `/`).

## The two-gate pattern

Two independent layers guard access to the app, and understanding why they
are split this way — instead of merged into one — is one of the more
important architectural facts about this codebase.

### Gate 1 — `apps/web/src/middleware.ts` (Edge runtime)

**Responsibility: session validity, nothing else.** On every matched
request, it:

1. Builds a `@supabase/ssr` client wired to read/write the request's
   cookies.
2. Calls `supabase.auth.getUser()` — **never** `supabase.auth.getSession()`.

**Why `getUser()` and not `getSession()`**: `getSession()` reads the session
straight out of the cookie and trusts it — fast, but it means a forged or
stale cookie would be accepted without any server-side check. `getUser()`
makes a request back to Supabase Auth to re-validate the JWT on every call —
slightly slower, but it guarantees the token presented is still genuinely
valid *right now* (not expired, not revoked). For a security gate that
decides "does this request get to see protected pages at all", that
guarantee is worth the extra round trip; this is explicitly called out with
an inline comment in the file.

3. If there's no valid user, redirects to `/login`. Otherwise passes the
   request through (with refreshed cookies attached to the response).

**Matcher exclusions** (routes middleware does NOT run on): `/auth/callback`
(must stay public for the OAuth flow itself), `/login`, `/banned` (banned
users must be able to see the ban notice), `/waitlist` (same, for waitlisted
users), `/onboarding/*` (authenticated-but-incomplete users must reach these
pages), `/api/*` (REST routes use their own `requireApiUser` Bearer-token
check instead), Next.js static/image assets, and any request path with a
file extension (`favicon.ico`, `manifest.json`, `sw.js`, `.png`, `.css`, etc).

### Gate 2 — `apps/web/src/app/(protected)/layout.tsx` (Node.js runtime)

**Responsibility: the real business-rule gate.** This Server Component wraps
every route under the `(protected)` route group and runs three checks in
order:

1. `getUser()` again (defense in depth — if middleware somehow let a request
   through without a session, this still catches it) → no user → `/login`.
2. **Ban check**: `prismaAdmin.user.findUnique({ where: { supabaseId },
   select: { bannedAt: true } })` → if `bannedAt` is set → `/banned`.
3. **Onboarding check**: `getOnboardingStatus(user.id)` → if there's an
   incomplete step → redirect there.

**Why this can't live in middleware: Prisma cannot run on the Edge
runtime, full stop.** Middleware executes in Next.js's Edge runtime (a
restricted, V8-isolate-based runtime, not full Node.js) specifically so it
can run close to the request with very low latency. Prisma's query engine
needs Node.js APIs (TCP sockets, native bindings for some engine types,
etc.) that the Edge runtime does not provide. There is no workaround that
keeps ban/onboarding checks in middleware without either (a) dropping Prisma
for that check and querying Postgres some other Edge-compatible way, or (b)
moving the middleware itself off the Edge runtime (losing its performance
benefit and its separation of concerns). The existing split — "Edge
middleware for cheap, Prisma-free session checks" + "Node.js layout for
everything that needs the database" — is the deliberate, documented answer
to that constraint.

**Tell the junior this explicitly**: if you ever need a new business-rule
redirect (a new kind of account restriction, a new required
onboarding/profile-completion step, a subscription gate, anything that needs
a DB read to decide), **it goes in `(protected)/layout.tsx`, never in
`middleware.ts`**. If you try to add a Prisma call to `middleware.ts`, it
will fail at build/runtime because of the Edge runtime restriction — this
is not a style preference, it's a hard platform limitation.

## Moderation system

The full lifecycle, end to end:

### Reasons and statuses

- `ReportReason` enum: `FAKE_PROFILE | HARASSMENT | SEXUAL_CONTENT | SPAM |
  UNDERAGE | OFFENSIVE_BEHAVIOR`.
- `ReportStatus` enum (the report's own lifecycle):
  - `PENDING` — just filed, awaiting admin review (default on creation).
  - `WARNED` — admin reviewed, decided a warning is enough, no account
    change.
  - `BANNED` — admin reviewed, decided to ban; sets the target's
    `bannedAt`.
  - `DISMISSED` — admin reviewed, decided the report was unfounded.

### Reporting a user

`reportUserAction` → `reportUser` (`lib/moderation/service.ts`, full
transaction detail in `docs/backend-server-actions-and-api.md`): creates the
`Report`, captures the last 20 messages of any shared conversation as JSON
`evidence` **before** auto-unmatching (because unmatching cascade-deletes the
conversation and messages — the evidence has to be snapshotted first or it's
lost forever), then deletes any `Match` between reporter and target in
either direction. `@@unique([reporterId, targetId])` means a second report
from the same reporter against the same target returns `{ error:
"already_reported" }` (Prisma `P2002`) instead of creating a duplicate row.

### Blocking a user

Independent of reporting — `blockUserAction` → `blockUser` just creates a
`Block` row (`@@unique([fromId, toId])`, same `P2002`-handling pattern).
Blocking does **not** auto-unmatch or capture evidence; it's a lighter-weight
"I don't want to see/hear from this person" action, whereas reporting is "I
want an admin to review this person's behavior."

### Admin resolving a report — `reviewReportAction`

1. Verifies the caller is an `ADMIN` (`resolveAdminUserId()`).
2. Loads the report, requires it to still be `PENDING` (no re-reviewing a
   resolved report).
3. Maps the admin's `decision` (`WARN | BAN | DISMISS`) to the corresponding
   `ReportStatus`, and — in one `$transaction` —:
   - Updates the report (`status`, optional `note`, `resolvedById`,
     `resolvedAt`).
   - If `BAN`: also sets `target.bannedAt = now()`, **and** deletes any
     existing `Appeal` row for that target. See below for why.

### A banned user appealing — `submitAppealAction`

A banned user (`bannedAt` set) can submit one appeal reason (trimmed,
max 2000 characters). `Appeal.userId` is `@unique` — **one appeal per user,
ever**, not one per ban. A second submission hits Prisma's `P2002` conflict
error, which `submitAppealAction` catches explicitly and maps to `{ error:
"already_appealed" }` rather than letting the exception bubble up as a
generic 500.

### Admin resolving an appeal — `reviewAppealAction`

1. Verifies `ADMIN` role, loads the appeal, requires `PENDING`.
2. `ACCEPT` → sets the appeal `ACCEPTED` and lifts the ban
   (`user.bannedAt = null`) in the same transaction — the user regains
   access immediately.
3. `REJECT` → sets the appeal `REJECTED`, ban stays in place, no further
   state change.

### Why banning deletes the pending appeal

Because `Appeal.userId` is unique, if user X was banned once, appealed, and
got `ACCEPTED` (ban lifted, appeal row stays in the DB as a historical
`ACCEPTED` record), and is later banned again for a *new* offense, that old
`ACCEPTED` appeal row is still sitting there. Without cleanup, any future
logic that checks "does this user have an accepted appeal" could
incorrectly treat the *new* ban as already resolved, based on a record that
actually refers to the *previous* ban. `reviewReportAction`'s `BAN` branch
deletes the user's existing appeal (regardless of its status) precisely to
prevent that stale-appeal-against-a-new-ban scenario — the user must file a
fresh appeal that genuinely corresponds to the current ban.

## Realtime (Supabase `postgres_changes`)

Two components hold live Supabase Realtime subscriptions.

### `ChatWindow` — four channels on one connection

```ts
// apps/web/src/components/chat/ChatWindow.tsx
const channel = supabase
  .channel(`conversation:${conversationId}`)
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages",
       filter: `conversationId=eq.${conversationId}` }, (payload) => { /* append message */ })
  .on("postgres_changes", { event: "DELETE", schema: "public", table: "matches",
       filter: `id=eq.${matchId}` }, () => { /* other user unmatched — leave chat */ })
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "blocks",
       filter: `toId=eq.${currentUserId}` }, () => { /* just got blocked — leave chat */ })
  .on("postgres_changes", { event: "UPDATE", schema: "public", table: "users",
       filter: `id=eq.${otherUser.id}` }, (payload) => { /* other user banned — leave chat */ })
  .subscribe();
```

One channel, four listeners, all scoped to this specific
conversation/match/user so the chat UI reacts live to: a new message
arriving, the other user unmatching, the current user getting blocked, and
the other user getting banned mid-conversation.

### `NotificationBell` — one channel + polling fallback

```ts
// apps/web/src/components/notifications/NotificationBell.tsx
const channel = supabase
  .channel("notifications")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" },
      () => { void refreshUnread(); })
  .subscribe();
```

This channel is **not** filtered by `userId` at the Postgres-changes level —
it listens to *all* `notifications` INSERTs and just re-fetches the current
user's unread count via the server action on every event (the server action
itself scopes the query to the current user, so no data leaks — it's just a
less precise trigger than it could be). Alongside this, there's a **60-second
polling fallback** (`setInterval(() => void refreshUnread(), 60_000)`)
specifically because realtime is best-effort — the comment in the file says
so explicitly: if the websocket connection drops or a publication event is
missed, the badge still converges to the correct count within a minute.

### ⚠️ The critical realtime gotcha

**Realtime only works if the table has been added to Postgres's
`supabase_realtime` publication, and this is a manual step that lives
entirely outside the codebase.** Concretely, on the Supabase project's
Postgres database, someone has to run:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

(or toggle the equivalent switch in the Supabase dashboard's Database →
Replication UI, per table).

**This is not enforced by any Prisma migration, any application code, or any
CI check.** The schema has no concept of "this table should be realtime
enabled" — that's purely a Postgres logical-replication-publication setting,
configured directly against the hosted database, independent of your
`schema.prisma` and your migration history.

**And unit tests will never catch a missing publication**, because every
test that touches `ChatWindow` or `NotificationBell` mocks the Supabase
client entirely (`createClient()` is swapped for a fake with a no-op
`.channel()/.on()/.subscribe()`), so the tests only verify "we call
`.channel(...).on(...).subscribe()` with the right arguments" — they never
talk to a real Postgres replication slot, and so a passing test suite tells
you nothing about whether realtime actually fires in production or in a
fresh environment.

**What to check if "realtime isn't working" during local dev against a fresh
Supabase project**:

1. Open the Supabase dashboard → Database → Replication, and confirm
   `messages`, `matches`, `blocks`, `users`, and `notifications` are listed
   under the `supabase_realtime` publication. A brand-new Supabase project
   typically starts with **no** tables in this publication.
2. If they're missing, either toggle them on in the dashboard or run the
   `ALTER PUBLICATION ... ADD TABLE ...` statements above directly against
   the database (e.g. via `psql` with `DIRECT_URL`, or the SQL editor in the
   dashboard).
3. Confirm you're testing against the actual hosted Supabase instance (or a
   local Supabase stack with realtime enabled) — not just a bare Postgres
   container, since `postgres_changes` is a Supabase Realtime server
   feature layered on top of logical replication, not something a stock
   Postgres instance provides on its own.
4. Only after confirming the publication is correct should you start
   debugging the client-side subscription code — the most common root cause
   by far, especially on a fresh project, is simply that the table was never
   added to the publication.
</content>
