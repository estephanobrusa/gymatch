# Backend Server Actions and API

This document explains the server-side business logic layer of the Gymatch
web app: Prisma client access, the Server Action conventions, the "dual API
surface" pattern that also serves the mobile app, every domain's actions, and
the transactional patterns worth understanding before you touch this code.

## The two Prisma clients (and why there is really only one)

There are two different "client" objects that touch external services in
this codebase, and it is critical to understand the difference before you
write a new server action:

1. **`prismaAdmin`** (`apps/web/src/lib/auth/admin.ts`) — a `PrismaClient`
   configured with `ADMIN_DATABASE_URL`, which embeds the Supabase **service
   role** key as the connection password. Postgres Row Level Security (RLS)
   is enforced per-role; the service role is explicitly exempt from RLS. This
   is the client used by **almost every piece of server-side code in this
   app** — every server action, every REST route, every Server Component that
   reads from the database.
2. **Supabase's own JS client** (`@supabase/ssr` in `lib/supabase/server.ts`,
   `@supabase/supabase-js` in `lib/api/auth.ts`, and `lib/supabase/client.ts`
   for the browser) — used **only** for two things: (a) Supabase Auth
   (`getUser()`, `signOut()`, `exchangeCodeForSession()`), and (b) Supabase
   Storage (uploading/deleting profile photos). **It is never used to query
   Postgres tables that Prisma manages** (`users`, `matches`, `messages`,
   etc.).

**There is no RLS-respecting Prisma client anywhere in this codebase.** Every
single database read and write goes through `prismaAdmin`, which bypasses
Postgres RLS entirely. This means **all authorization is manual application
code**, not a database guarantee. If you add a new server action or API
route, you are 100% responsible for checking "is this user allowed to do
this" yourself — there is no safety net below you. Look at the pattern every
existing action follows:

```ts
const authUser = await getUser();              // 1. Who is this, per Supabase Auth?
if (!authUser) redirect("/login");

const dbUser = await prismaAdmin.user.findUnique({   // 2. Resolve to our internal id
  where: { supabaseId: authUser.id },
  select: { id: true },
});
if (!dbUser) redirect("/login");

// 3. THEN check whatever business rule applies (ownership, role, ban status...)
//    before doing the actual prismaAdmin read/write.
```

Skipping step 3 — or trusting that "the database will stop them" — is the
single most dangerous mistake you can make in this codebase.

## The `ActionResult` convention

Most mutations return a structured result type instead of throwing:

```ts
type ActionResult = { success: true } | { error: string };
```

(Defined independently per-domain — `lib/chat/actions.ts`,
`lib/moderation/actions.ts`, `lib/waitlist/actions.ts` — and also exported
from `@gymatch/core` for actions like `deleteAccountAction`.)

**Use `ActionResult` when the calling UI needs to stay on the page and show
feedback** — a toast, an inline error message, a disabled button state — for
example blocking a user, submitting a report, or sending a chat message that
failed. The client component awaits the call and branches on `"error" in
result`.

```ts
// lib/moderation/actions.ts
export async function blockUserAction(targetId: string): Promise<ActionResult> {
  const currentUserId = await resolveCurrentUserId();
  if (!currentUserId) return { error: "auth" };
  return blockUser(currentUserId, targetId);
}
```

**Use `redirect()` + throwing a plain `Error` when the action is itself a
multi-step wizard navigation** — the onboarding flow is the clearest example.
Each onboarding step action validates its input, writes to the DB, and then
unconditionally calls `redirect()` on success. On validation failure it
`throw`s a plain `Error` with a user-facing message, which Next.js surfaces
via its error boundary / form `action` error handling — there is no
"stay on this page and show a toast" requirement here, because failure
should keep you on the same onboarding step with the thrown message shown.

```ts
// lib/auth/actions.ts
export async function updateBirthDate(formData: FormData): Promise<void> {
  const user = await getUser();
  if (!user) redirect("/login");

  const raw = (formData.get("birthDate") as string | null)?.trim() ?? "";
  if (!raw) throw new Error("Birth date is required.");

  const birthDate = new Date(raw);
  if (isNaN(birthDate.getTime())) throw new Error("Invalid date.");
  // ...age check, throws on failure...

  await prismaAdmin.user.update({ where: { supabaseId: user.id }, data: { birthDate } });
  redirect("/onboarding/photo");  // success → navigate forward
}
```

Rule of thumb: if the action is a step in a linear wizard, `redirect()` +
`throw`. If the action is a standalone mutation triggered from a page the
user should stay on, return `ActionResult`.

## Domain-by-domain reference

Every table below lists: file, function, one-line purpose, return type.

### Auth / onboarding

`apps/web/src/lib/auth/actions.ts`

| Function | Purpose | Returns |
|---|---|---|
| `signOut()` | Signs out of Supabase and redirects to `/login`. | `void` |
| `updateUsername(formData)` | Validates + sets username (3-30 chars, alphanumeric+underscore, unique). Redirects to `/onboarding/birthdate`. | `void` |
| `updateBirthDate(formData)` | Validates + sets birth date (must be ≥ 18yo). Redirects to `/onboarding/photo`. | `void` |
| `savePhotoUrl(photoUrl)` | Saves the first onboarding photo (position 0). Redirects to `/`. | `void` |
| `saveFitnessProfileAction(data)` | Partial update of fitness fields (disciplines, goals, experience, schedule). Redirects to `/onboarding/routine`. | `void` |
| `saveScheduleAction(schedule)` | Sets the final onboarding schedule preference. Redirects to `/`. | `void` |
| `deleteAccountAction()` | Deletes the Prisma `User` row (cascades remove photos/swipes/matches/etc.) and signs out. | `ActionResult` |

`apps/web/src/lib/auth/index.ts`

| Function | Purpose | Returns |
|---|---|---|
| `getUser()` | Returns the current Supabase auth user via `getUser()` (re-validated), or `null`. | `SupabaseUser \| null` |
| `syncUser(supabaseUser)` | Upserts the Prisma `User` row from a Supabase auth user. Called once, at the OAuth callback, before the DB row exists. | `PrismaUser` |

`apps/web/src/lib/auth/onboarding.ts`

| Function | Purpose | Returns |
|---|---|---|
| `getOnboardingStatus(supabaseId)` | Returns the first incomplete onboarding step's path, or `null` if complete. Steps 4/5 (fitness, routine) are gated behind `onboardingVersion >= 2`. | `OnboardingStatus` |

`apps/web/src/lib/auth/require-admin.ts`

| Function | Purpose | Returns |
|---|---|---|
| `requireAdmin()` | Resolves the DB user and verifies `role === ADMIN`; redirects otherwise. | DB user `{ id, name, email, role }` |

### Swipe / matching

`apps/web/src/lib/swipe/actions.ts`

| Function | Purpose | Returns |
|---|---|---|
| `recordSwipe(toId, direction)` | Resolves current user, delegates to `recordSwipeForUser`, fires a push notification on match. | `SwipeResult` |
| `getDiscoveryFeedAction(cursor?)` | Resolves current user, delegates to `getDiscoveryFeed` (pure auth+delegation boundary). | `{ cards, nextCursor }` |

`apps/web/src/lib/swipe/service.ts`

| Function | Purpose | Returns |
|---|---|---|
| `recordSwipeForUser(fromId, toId, direction)` | Upserts the swipe, detects mutual LIKE, creates `Match`+`Conversation`+`Notification` atomically. See [transactional patterns](#swipe--match-creation) below. | `SwipeResult` |

### Chat

`apps/web/src/lib/chat/actions.ts`

| Function | Purpose | Returns |
|---|---|---|
| `getMatchesAction()` | All matches for the current user (preview cards). | `MatchPreview[]` |
| `getMessagesAction(conversationId, cursor?)` | Paginated messages, oldest-first, 20/page. | `ConversationPage` |
| `sendMessageAction(conversationId, body)` | Creates a message, fires push to the other participant. | `ChatMessage` |
| `markAsReadAction(conversationId)` | Marks the other participant's messages as read. | `void` |
| `getConversationIdAction(matchId)` | Resolves a match's conversation id (used by the match modal). | `string \| null` |
| `unmatchAction(matchId)` | Deletes the match (cascades conversation+messages). | `ActionResult` |

`apps/web/src/lib/chat/service.ts`

| Function | Purpose | Returns |
|---|---|---|
| `getMatchesForUser(userId)` | Matches list, filtered to exclude blocked/banned counterparts. | `MatchPreview[]` |
| `getConversationMessages(userId, conversationId, cursor?)` | Verifies participation, returns a page of messages. | `ConversationPage \| null` |
| `sendMessageForUser(userId, conversationId, body)` | Verifies participation + not blocked, creates message + notification. | `SentMessage` |
| `markConversationReadForUser(userId, conversationId)` | Marks the other participant's unread messages as read. | `void` |
| `unmatchForUser(userId, matchId)` | Verifies participation, deletes the match. | `ActionResult` |

### Gym

`apps/web/src/lib/gym/actions.ts`

| Function | Purpose | Returns |
|---|---|---|
| `searchGymsAction(query)` | Proxies the Google Places Text Search API (server-only API key). | `GymSearchResult[]` |
| `saveGymAction(placeId, name, address)` | Upserts a `Gym` by `googlePlaceId`, links it to the current user. | `{ success } \| { error }` |

### Events

`apps/web/src/lib/events/actions.ts`

| Function | Purpose | Returns |
|---|---|---|
| `createEventAction(input)` | Validates input, derives `city`, creates an `Event`. | `{ success, eventId } \| { error }` |
| `updateEventAction(eventId, input)` | Same validation, enforces creator-only, re-derives `city`. | `{ success } \| { error }` |
| `deleteEventAction(eventId)` | Creator-only delete. | `{ success } \| { error }` |
| `toggleEventRsvpAction(eventId)` | Resolves current user, delegates to `toggleEventRsvp`. | `{ success, attending } \| { error }` |

`apps/web/src/lib/events/service.ts`

| Function | Purpose | Returns |
|---|---|---|
| `toggleEventRsvp(eventId, userId)` | Toggles the `EventRsvp` row for a user/event pair. | `EventRsvpResult` |

### Moderation

`apps/web/src/lib/moderation/actions.ts`

| Function | Purpose | Returns |
|---|---|---|
| `blockUserAction(targetId)` | Creates a `Block` row. | `ActionResult` |
| `unblockUserAction(targetId)` | Deletes the `Block` row (idempotent). | `ActionResult` |
| `reportUserAction(targetId, reason)` | Delegates to `reportUser` (report + auto-unmatch + evidence capture). | `ActionResult` |
| `resolveAdminUserId()` | Resolves DB id and verifies `ADMIN` role; `null` otherwise. | `string \| null` |
| `reviewReportAction(reportId, decision, note?)` | Admin decision on a pending report: `WARN`/`BAN`/`DISMISS`. Bans also delete any pending appeal. | `ActionResult` |
| `submitAppealAction(reason)` | Submits one ban appeal (unique constraint enforced, `P2002` handled). | `ActionResult` |
| `reviewAppealAction(appealId, decision, adminNote?)` | Admin decision on a pending appeal: `ACCEPT` (lifts ban) / `REJECT`. | `ActionResult` |

`apps/web/src/lib/moderation/service.ts`

| Function | Purpose | Returns |
|---|---|---|
| `blockUser(userId, targetId)` | Creates a `Block`, handles `P2002` (already blocked). | `ActionResult` |
| `reportUser(userId, targetId, reason)` | Creates a `Report`, captures message evidence, auto-unmatches — all in one transaction. See [transactional patterns](#moderation-evidence-capture-before-cascade-delete) below. | `ActionResult` |

### Notifications

`apps/web/src/lib/notifications/actions.ts`

| Function | Purpose | Returns |
|---|---|---|
| `getNotificationsAction()` | Current user's notifications, newest first. | `NotificationPreview[]` |
| `getUnreadNotificationsCountAction()` | Unread count for the bell badge. | `number` |
| `markNotificationsReadAction()` | Marks all unread notifications as read. | `void` |

### Profile

`apps/web/src/lib/profile/actions.ts`

| Function | Purpose | Returns |
|---|---|---|
| `updateProfileAction(data)` | Partial profile field update. | `{ success } \| { error }` |
| `addPhotoAction(url, storagePath)` | Adds a photo (max 6), appended at the end. | `{ success, photo } \| { error }` |
| `deletePhotoAction(photoId)` | Deletes a photo (and its Storage object, if any); re-numbers remaining photos. See [transactional patterns](#photo-deletion) below. | `{ success } \| { error }` |
| `reorderPhotosAction(photoIds)` | Reassigns `position` per the given order. Verifies ownership of every id first. | `{ success } \| { error }` |
| `setHideProfileAction(hidden)` | Toggles discovery visibility. | `{ success } \| { error }` |
| `setIncognitoModeAction(incognito)` | Toggles incognito mode. | `{ success } \| { error }` |
| `updateScheduleSlotsAction({ slots })` | Replaces all weekly schedule slots (delete-then-insert transaction), with full shape/time validation. | `{ success } \| { error }` |

### Push

`apps/web/src/lib/push/actions.ts`

| Function | Purpose | Returns |
|---|---|---|
| `subscribePushAction(subscription)` | Upserts a `PushSubscription` by endpoint. | `{ success } \| { error }` |
| `unsubscribePushAction(endpoint)` | Deletes a subscription by endpoint. | `{ success } \| { error }` |
| `sendPushToUser(userId, payload)` | Internal helper: sends Web Push to every subscription of a user; cleans up subscriptions that return HTTP 410 Gone. | `void` |

### Routine

`apps/web/src/lib/routine/actions.ts`

| Function | Purpose | Returns |
|---|---|---|
| `saveRoutineAction(data)` | Upserts the current user's `WeeklyRoutine` (all 7 days replaced atomically). | `void` |
| `getRoutineAction()` | Returns the current user's `WeeklyRoutine`, or `null`. | `WeeklyRoutine \| null` |

### Waitlist (admin)

`apps/web/src/lib/waitlist/actions.ts`

| Function | Purpose | Returns |
|---|---|---|
| `setWaitlistActiveAction(active)` | Toggles the `WAITLIST_ACTIVE` `AppSetting` (admin only). | `ActionResult` |
| `removeWaitlistEntryAction(entryId)` | Removes a waitlist entry (admin only); throws plain `Error` on unauthorized, not `ActionResult` — this one is inconsistent with its neighbor, worth normalizing if you touch this file. | `void` |

## The "dual API surface" pattern

The exact same business logic is reachable from two different entry points:

1. **Server Actions** (everything documented above) — called directly by the
   Next.js web UI via React's `"use server"` mechanism.
2. **REST routes** under `apps/web/src/app/api/v1/*` — called exclusively by
   the **mobile app** (`apps/mobile`). React Native cannot call a Next.js
   Server Action directly (Server Actions are a Next.js/React-specific RPC
   mechanism tied to the framework's bundler); the mobile app needs a plain
   HTTP API instead.

Both call into the **same** `service.ts` functions. For example:

- Web: `recordSwipe()` (action, `lib/swipe/actions.ts`) → `recordSwipeForUser()`
- Mobile: `POST /api/v1/swipe` (`app/api/v1/swipe/route.ts`) →
  `recordSwipeForUser()`

The REST side has its own small helper layer instead of `getUser()` +
cookies, because mobile clients can't use cookie-based sessions:

- **`lib/api/auth.ts` — `requireApiUser(request)`**: validates a `Bearer
  <token>` header against Supabase Auth (`supabase.auth.getUser(token)`, same
  re-validation guarantee as the web `getUser()`), resolves the matching
  Prisma user, and returns `{ authUser, dbUser } | null`. Uses a cookie-less
  `@supabase/supabase-js` client, since mobile requests carry the JWT in the
  `Authorization` header, not in cookies.
- **`lib/api/http.ts`**:
  - `apiError(status, message)` — the standard `{ error }` JSON error
    response shape.
  - `readJsonBody<T>(request)` — parses the JSON body, returns `null` on
    malformed/missing body (caller maps that to a 400).
  - `handleApiRequest(request, run)` — wraps a route handler: calls
    `requireApiUser`, returns 401 if it fails, and catches any unhandled
    error into a generic 500 (so a bug never leaks a stack trace to a mobile
    client).

**The rule you must internalize**: when you fix a bug or change business
logic for any domain, it almost certainly exists in **two** places — the
Server Action file and the matching `app/api/v1/.../route.ts` file — *unless*
you fixed it in `service.ts`, in which case both callers pick up the fix for
free. Prefer putting logic in `service.ts` specifically so you only have to
fix it once. If you ever find yourself duplicating a validation rule or a
business check directly inside both `actions.ts` and a `route.ts` file
instead of `service.ts`, that's a sign the logic should be moved down into
the shared service function.

## Transactional / side-effect patterns worth knowing

### Swipe → Match creation

`recordSwipeForUser` (`apps/web/src/lib/swipe/service.ts`) does the following
inside a single `prismaAdmin.$transaction`:

1. Upsert the `Swipe` row (`fromId`/`toId`/`direction`).
2. If the direction is `LIKE`, look for a reverse `LIKE` row (`toId` → `fromId`).
3. If found (mutual match): normalize `userAId`/`userBId` with the
   lexicographic-minimum ordering invariant (see
   `docs/backend-data-model.md`'s "Models → Match" section for the full
   explanation and example), create the `Match`, create its `Conversation`,
   and create a `NEW_MATCH` `Notification` for the *other* user (the swiper
   who triggered the match sees it client-side via the returned
   `SwipeResult`, so only the other side needs a stored notification).
4. Return the matched user's display data (name + first photo) for the match
   modal.

Everything is atomic — if any step fails, nothing is partially created
(no orphan `Match` with no `Conversation`, no `Swipe` upserted without its
corresponding match check having run).

### Moderation: evidence capture before cascade delete

`reportUser` (`apps/web/src/lib/moderation/service.ts`) runs inside a
`$transaction`:

1. Find the shared `Match` (either direction) and its most recent
   `Conversation`.
2. If one exists, fetch its **last 20 messages**, reverse them into
   chronological order, and build a JSON `evidence` blob
   (`{ messages: [{ senderId, body, createdAt }] } `).
3. Create the `Report` row, attaching `evidence` if any was captured.
4. Delete the `Match` in either direction (`deleteMany`, so "no match" is a
   safe no-op).

**Why step 2 happens before step 4, and not after**: `Match.onDelete:
Cascade` means deleting the `Match` row cascades to `Conversation`
(`onDelete: Cascade` on `conversationId` → `matchId`), which in turn cascades
to every `Message` in it. If the evidence snapshot were taken *after* the
delete, there would be nothing left to snapshot — the messages would already
be gone from the database. The evidence has to survive the report even
though the chat itself is intentionally destroyed (to immediately kick the
reported user out of the conversation).

Banning a user (inside `reviewReportAction`, a `BANNED` decision) also
deletes any existing pending `Appeal` row for that user
(`prismaAdmin.appeal.deleteMany({ where: { userId: report.targetId } })`).
**Why**: `Appeal.userId` is unique — one appeal per user, ever. If a user was
previously banned, appealed, and got `ACCEPTED` (ban lifted), and is then
banned again for a new offense, that old `ACCEPTED` appeal row would still
exist and could be misread by `/banned`-style checks as "this user's ban was
already resolved" — even though it refers to the *previous* ban, not the
current one. Deleting it forces a fresh appeal for the new ban, so the
appeal status always refers to the user's *current* ban.

### Photo deletion

`deletePhotoAction` (`apps/web/src/lib/profile/actions.ts`):

1. Verifies the photo belongs to the current user.
2. If `photo.storagePath` is set, calls
   `supabase.storage.from("profile-photos").remove([photo.storagePath])` to
   delete the actual file object from Supabase Storage — otherwise deleting
   the DB row would leave an orphaned file in the bucket forever (Storage is
   not tied to Postgres, so there is no cascade for it). Older photos created
   before the `storagePath` column existed (migration
   `20260812163730_add_storage_path_to_user_photo`) have `storagePath = null`
   and are simply skipped — their file, if any, cannot be targeted for
   cleanup.
3. Deletes the `UserPhoto` row.
4. Re-fetches the user's remaining photos ordered by `position` and
   re-numbers them contiguously from `0` in a `$transaction`, so there are
   never "gaps" in the position sequence after a deletion (e.g. deleting
   position 1 out of `[0, 1, 2]` turns the remaining two into `[0, 1]`, not
   `[0, 2]`).

## Feature flags

`packages/core/lib/swipe/feature-flags.ts` — `isFeatureEnabled(flag, prefix?)`:

```ts
export function isFeatureEnabled(
  flag: FeatureFlag,
  prefix: string = FEATURE_FLAG_PREFIX  // "NEXT_PUBLIC_"
): boolean {
  return process.env[`${prefix}FEATURE_${flag}`] === "true";
}
```

Flags are read from `<prefix>FEATURE_<FLAG>` env vars so the exact same
check works both client- and server-side. The **prefix is configurable per
platform** because each bundler only statically inlines env vars with its
own required prefix:

- **Web (Next.js)**: `NEXT_PUBLIC_` — the default, matches historical
  behavior, so most web call sites call `isFeatureEnabled("SUPER_LIKE")` with
  no second argument.
- **Mobile (Expo)**: `EXPO_PUBLIC_` — Metro only inlines `EXPO_PUBLIC_*` at
  build time, so any mobile call site **must** pass `"EXPO_PUBLIC_"`
  explicitly as the second argument, or the check silently reads the
  (web-only) `NEXT_PUBLIC_*` variable instead — which is never set in an Expo
  build, so the flag will always evaluate to `false`, with no error or
  warning anywhere.

**Where this matters today, verified in the code**:

- `apps/mobile/src/components/swipe/CardStack.tsx` correctly passes the
  prefix when deciding whether to **show** the rewind button:
  `isFeatureEnabled("REWIND", "EXPO_PUBLIC_")`.
- ⚠️ **Known issue, worth fixing**: the *actual* rewind action lives in the
  shared store `packages/core/stores/swipe.store.ts` (used by both web and
  mobile), and its `rewind()` implementation calls `isFeatureEnabled("REWIND")`
  with **no prefix argument** — defaulting to `NEXT_PUBLIC_`. On mobile,
  `NEXT_PUBLIC_FEATURE_REWIND` is never set/inlined (only `EXPO_PUBLIC_*` is),
  so even when `CardStack.tsx` correctly shows the rewind button (gated on
  the right `EXPO_PUBLIC_FEATURE_REWIND` flag), tapping it silently does
  nothing on a real Expo build, because the shared store's internal check
  reads the wrong variable and always returns `false`. The button becomes
  visible-but-dead. If you fix this, either pass the right prefix into the
  store (the store doesn't currently have platform information) or move the
  flag check up into each platform's calling code instead of inside the
  shared store.

**Lesson for new code**: any time you call `isFeatureEnabled` from code that
is shared between `packages/core` and *consumed* by mobile, make sure the
prefix is threaded through correctly all the way to the actual gate — a
correct prefix at the UI layer does not guarantee a correct prefix deeper in
shared logic.
