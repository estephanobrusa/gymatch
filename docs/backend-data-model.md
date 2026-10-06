# Backend Data Model

This document explains the Prisma schema that backs Gymatch
(`packages/db/prisma/schema.prisma`), the migration history, and how to work
with the database locally. It is aimed at a junior developer who has never
used Prisma before.

If you only read one thing from this file, read the **Match invariant**
section — it is the single most important non-obvious rule in the schema.

## Table of contents

- [How the schema is organized](#how-the-schema-is-organized)
- [Datasource configuration](#datasource-configuration)
- [Models](#models)
- [Enums](#enums)
- [Migration history (changelog)](#migration-history-changelog)
- [The `prisma.config.ts` quirk](#the-prismaconfigts-quirk)
- [Running migrations and seeding locally](#running-migrations-and-seeding-locally)

## How the schema is organized

`schema.prisma` is a single file, divided into clearly labeled sections with
`// ──` banner comments:

1. Routine enums (`SessionType`, `MuscleGroup`, `RoutineTemplate`)
2. Profile enums (`Gender`, `FitnessGoal`, `ExperienceLevel`, `Schedule`,
   `Discipline`, `LookingFor`)
3. Admin (`Role`)
4. User & Profile (`User`, `UserPhoto`)
5. Weekly Routine (`WeeklyRoutine`)
6. Gym (`Gym`)
7. Weekly Schedule (`DayOfWeek`, `ScheduleSlot`)
8. Events (`EventType`, `Event`, `EventRsvp`)
9. Matching (`Swipe`, `SwipeDirection`, `Match`)
10. Messaging (`Conversation`, `Message`)
11. Moderation (`ReportReason`, `ReportStatus`, `AppealStatus`, `Report`,
    `Block`)
12. Appeals (`Appeal`)
13. Notifications (`NotificationType`, `Notification`)
14. Push Subscriptions (`PushSubscription`)
15. Waitlist (`WaitlistEntry`, `AppSetting`)

Every model maps to a `snake_case` table name via `@@map(...)` (e.g. `User` →
`users`), because the underlying Postgres convention in this project is
snake_case while the Prisma/TypeScript convention is PascalCase/camelCase.

## Datasource configuration

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // Supabase pooler, port 6543 — runtime queries
  directUrl = env("DIRECT_URL")     // direct connection, port 5432 — migrations
}
```

Supabase puts a connection pooler (PgBouncer) in front of Postgres. Prisma's
runtime query engine talks to the **pooler** (`DATABASE_URL`, port 6543),
because the app can open many short-lived connections and the pooler handles
that efficiently. Running a *migration*, however, needs a session-level
direct connection that the pooler does not support well (e.g. prepared
statements, `CREATE INDEX CONCURRENTLY`), so `prisma migrate` uses
`DIRECT_URL` (port 5432) instead. You will see both env vars in
`apps/web/.env.local`.

## Models

### `User` (`users`)

The central entity. Holds both auth-linkage fields and the full dating/profile
shape.

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(uuid())` | Internal Prisma id — **this** is the id used everywhere else in the app (Swipe, Match, Message, etc.), never the Supabase auth id directly. |
| `supabaseId` | `String @unique` | Links to the Supabase Auth user. One-to-one. |
| `email` | `String @unique` | Mirrors the Supabase auth email. |
| `name` | `String` | Display name, from Google OAuth metadata. |
| `username` | `String? @unique` | Set during onboarding step 1. Nullable until then. |
| `birthDate` | `DateTime?` | Set during onboarding step 2. Must make the user ≥ 18 (enforced in app code, not the schema). |
| `bio`, `city`, `height`, `weight` | optional scalars | Free-form profile fields. |
| `gymId` | `String?` | FK to `Gym`, nullable (not everyone has picked a gym). |
| `gender` | `Gender?` | Enum, optional. |
| `maxDistance`, `minAge`, `maxAge` | `Int?` / defaults | Discovery filter preferences. `minAge` defaults to 18, `maxAge` to 50. |
| `fitnessGoals`, `schedule`, `disciplines`, `lookingFor` | `Enum[]` | Postgres native array columns — Prisma lets you store a list of enum values directly on the row instead of a join table. Cheap to query with "has any of" filters, at the cost of not being normalizable the way a join table would be. |
| `experienceLevel` | `ExperienceLevel?` | Enum, optional. |
| `weeklyFrequency` | `Int?` | Workouts/week, used by the (gated) fitness onboarding step. |
| `onboardingVersion` | `Int @default(1)` | Feature-gates onboarding steps 4/5 (fitness, routine). Existing users default to `1` and are **not** forced through the new steps; see `lib/auth/onboarding.ts`. |
| `role` | `Role @default(USER)` | `USER` or `ADMIN`. Checked manually in `requireAdmin()` / `resolveAdminUserId()` — there is no DB-level enforcement. |
| `todayMuscleGroup`, `todaySessionType` | optional enums | "What are you training today" — surfaced on the home feed. |
| `hideProfile`, `incognitoMode` | `Boolean @default(false)` | User-controlled visibility toggles — not the same as a ban. |
| `bannedAt` | `DateTime?` | Non-null = banned. Checked in the `(protected)/layout.tsx` gate and in most list queries (discovery, matches, gym pages). |

Relations: a `User` fans out to almost every other model in the schema —
`gym`, `weeklyRoutine` (1:1), `photos`, `scheduleSlots`, swipes made/received,
matches as user A/B, messages sent, reports given/received/resolved, blocks
given/received, appeals owned/reviewed, notifications received/sent (as
actor), created events, event RSVPs, and push subscriptions. Most of these
use named relations (e.g. `@relation("SwipeFrom")`) because a single model
(`Swipe`, `Report`, `Block`, `Appeal`, `Notification`) references `User` more
than once and Prisma needs a name to disambiguate which FK is which.

### `UserPhoto` (`user_photos`)

```prisma
model UserPhoto {
  id          String   @id @default(uuid())
  userId      String
  url         String
  storagePath String?
  position    Int      @default(0)
  createdAt   DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- `url` is the public Supabase Storage URL used by `<img>` tags.
- `storagePath` is the *internal* Storage object path (e.g.
  `profile-photos/<userId>/<file>.jpg`), used only to delete the underlying
  object from Storage when the photo is removed (see
  `docs/backend-server-actions-and-api.md`, photo deletion section). It is
  nullable because early rows (before this field existed, see migration
  history) never recorded it.
- `position` orders photos in the profile carousel; 0 is the primary photo.
  There is no unique constraint on `(userId, position)` — the app is
  responsible for keeping positions contiguous (see
  `deletePhotoAction`/`reorderPhotosAction`).
- `onDelete: Cascade` — deleting a `User` deletes all their photos
  automatically at the database level.

### `WeeklyRoutine` (`weekly_routines`)

One row per user (`userId @unique` enforces the 1:1), one `MuscleGroup?`
column per day of the week (`mon` … `sun`). `null` means rest/no training
planned that day. This is a deliberately denormalized "wide table" shape
instead of 7 rows in a child table — simpler to read/write atomically as one
record, since a routine is always edited as a whole week at once (see
`saveRoutineAction`).

### `Gym` (`gyms`)

A physical gym, usually sourced from the Google Places API (`googlePlaceId`
is the unique external key used to avoid creating duplicate gym rows for the
same real-world place — see `saveGymAction`'s `upsert`). `lat`/`lng` are
optional and currently unused by any query but reserved for future
distance-based filtering.

### `ScheduleSlot` (`schedule_slots`)

A single recurring weekly training-time slot for a user (e.g. "Monday
18:00–19:00, Leg day, at Gym X"). `startTime`/`endTime` are stored as plain
`"HH:mm"` strings rather than `DateTime` — there is no associated calendar
date, only a day-of-week + time-of-day, so a `DateTime` column would force an
arbitrary date component that means nothing. `@@index([userId])` speeds up
"get my week" queries. `gymId` is optional with `onDelete: SetNull` — if a gym
is ever deleted, slots referencing it survive with `gymId = null` instead of
being destroyed.

### `Event` (`events`)

A community event (clinic, tournament, meetup, etc.) hosted at a gym or a
free-form location.

- `city` is **denormalized** — copied from the gym's city (or the creator's
  city for gymless events) at creation/update time, purely so the "events
  near me" filter can do a simple `WHERE city = ?` instead of a join + filter
  on every list query. See `deriveEventCity()` in `lib/events/actions.ts`.
- `price` is an integer in whole currency units; `0` means free.
- `disciplines` is a native enum array, same pattern as `User.disciplines`.
- `@@index([gymId])` and `@@index([startsAt])` support the two most common
  list queries: "events at this gym" and "upcoming events sorted by date".
- `creator` uses `onDelete: Cascade` — if the creating user is deleted, their
  events are deleted too (no "orphaned" events with no owner to manage them).

### `EventRsvp` (`event_rsvps`)

Join table between `User` and `Event`. `@@unique([eventId, userId])` prevents
a user from RSVPing to the same event twice — the "toggle RSVP" logic in
`toggleEventRsvp()` relies on this: it looks for an existing row and either
deletes it (un-RSVP) or creates it (RSVP), and the unique constraint is the
safety net if that check-then-act ever races.

### `Swipe` (`swipes`)

```prisma
model Swipe {
  fromId    String
  toId      String
  direction SwipeDirection // LIKE | PASS
  @@unique([fromId, toId])
}
```

`@@unique([fromId, toId])` means a given user can only have **one** swipe
record against another given user at a time. This is not just a dedup
mechanism — it is what makes `recordSwipeForUser`'s `upsert` correct: if you
pass on someone and later like them (profile re-appears, or admin resets the
feed), the existing row is *updated* in place rather than creating a second,
contradictory row. Without this constraint you could end up with both a PASS
and a LIKE row for the same pair, and "did they swipe LIKE on me" queries
would become ambiguous.

Note the constraint is **directional**: `(A, B)` and `(B, A)` are different
rows. That is intentional — two separate swipes, one per direction, are
exactly what mutual-match detection needs to check (see `Match` below).

### `Match`

```prisma
model Match {
  userAId   String
  userBId   String
  @@unique([userAId, userBId])
}
```

**This is the single most important invariant in the schema.** A `Match` is
created when two users both LIKE each other. Naively, you'd store
`(fromUserId, toUserId)` — but that creates a problem: user A matching with
user B could be represented as `(A, B)` *or* `(B, A)` depending on who swiped
last, and `@@unique([userAId, userBId])` alone would **not** stop a duplicate
match being created in the other order.

The fix used in this codebase (`recordSwipeForUser` in
`apps/web/src/lib/swipe/service.ts`): **always store the lexicographically
smaller user id in `userAId`**, regardless of who swiped last.

```ts
const userAId = fromId < toId ? fromId : toId;
const userBId = fromId < toId ? toId : fromId;
```

Example: user ids `"11111111-..."` (user X) and `"99999999-..."` (user Y)
mutually like each other.
- If X swipes last: naive code would try to insert `(userAId: X, userBId: Y)`.
- If Y swipes last: naive code would try to insert `(userAId: Y, userBId: X)`.

Both represent the *same match*, but to the unique index they look like two
different rows (`(X, Y)` vs `(Y, X)`) — so without the ordering rule, the
database would happily create two `Match` rows for the same pair, leading to
duplicate conversations, duplicate notifications, and a confusing matches
list. By always normalizing to `userAId = min(X, Y)`, both swipe orders
produce the exact same `(userAId, userBId)` tuple, so `@@unique` correctly
rejects (or rather, naturally prevents — the logic checks for an existing
reverse swipe before ever attempting the insert) a second identical match.

When reading a `Match`, code almost always checks both sides
(`match.userAId === currentUserId || match.userBId === currentUserId`) — the
"A"/"B" naming is purely a storage-ordering detail, it carries **no**
semantic meaning (A is not "the swiper" or "the first user").

### `Conversation` (`conversations`)

One per `Match` (not enforced by a unique constraint, but the app only ever
creates one, right alongside the `Match`, inside the same `$transaction`).
`onDelete: Cascade` from `Match` — deleting a match deletes its conversation.

### `Message` (`messages`)

Belongs to a `Conversation` and has a `sender`. `readAt` is `null` until the
recipient (not the sender) opens the conversation and `markAsReadAction`
flips it. Both `conversation` and `sender` relations cascade-delete — deleting
a user deletes every message they ever sent, deleting a match/conversation
deletes every message in it.

### `Report` (`reports`)

```prisma
model Report {
  reporterId   String
  targetId     String
  reason       ReportReason
  status       ReportStatus @default(PENDING)
  evidence     Json?
  resolvedById String?
  @@unique([reporterId, targetId])
  @@index([status])
}
```

- `@@unique([reporterId, targetId])` — a user can only have one open/resolved
  report against a given target; re-reporting hits a `P2002` error that the
  action layer turns into `{ error: "already_reported" }`.
- `evidence` is a free-form JSON blob. See
  `docs/backend-server-actions-and-api.md` for *why* it exists: the report
  flow auto-unmatches (deletes the `Match`), and deleting the match cascades
  to its `Conversation` and all `Message` rows — so the last 20 messages are
  captured into `evidence` **before** the delete happens, or that evidence
  would be gone forever.
- `@@index([status])` supports the admin dashboard's "pending reports" list.
- `resolvedBy` uses `onDelete: SetNull` — if the admin who resolved a report
  is later deleted, the report keeps its history but loses the dangling FK.

### `Block` (`blocks`)

Same shape as `Swipe`/`Report`: `@@unique([fromId, toId])` prevents duplicate
blocks. Directional like `Swipe` — `A blocks B` and `B blocks A` are
independent rows, which is why conversation/match visibility checks always
test both directions (`blocksGiven`/`blocksReceived` on both participants).

### `Appeal` (`appeals`)

```prisma
model Appeal {
  userId String @unique
  status AppealStatus @default(PENDING)
  @@index([status])
}
```

`userId @unique` means **one appeal per user, ever** (not per-ban). This is
deliberate and interacts with the moderation flow: when an admin bans a user
a second time (a new `Report` resolved as `BANNED`), any existing `Appeal` row
for that user is explicitly deleted first (`prismaAdmin.appeal.deleteMany`
inside `reviewReportAction`'s transaction) — otherwise a stale `ACCEPTED`
appeal from a previous ban could incorrectly read as "this user's ban was
already lifted" against a brand-new ban. Deleting it forces the user to file
a fresh appeal for the new ban.

### `Notification` (`notifications`)

```prisma
model Notification {
  userId         String // recipient
  type           NotificationType
  actorId        String?
  matchId        String?
  conversationId String?
  readAt         DateTime?
  @@index([userId, readAt])
}
```

`actorId` is nullable to support future system-generated notifications with
no human actor. `matchId`/`conversationId` are optional "deep link" targets
depending on `type` (`NEW_MATCH` sets `matchId`, `NEW_MESSAGE` sets
`conversationId`) — the schema doesn't enforce which combination is valid per
type, that's the job of the code that creates each notification.
`@@index([userId, readAt])` is the exact shape of the two hot queries: "my
unread count" (`WHERE userId = ? AND readAt IS NULL`) and "my notification
feed" (`WHERE userId = ? ORDER BY createdAt`).

### `PushSubscription` (`push_subscriptions`)

One row per *browser/device* subscription (a user can have several — one per
device they've granted push permission on). `endpoint` is the unique Web Push
endpoint URL; it is the natural key used for `upsert` in `subscribePushAction`
and for cleanup when a push send returns HTTP 410 Gone (see
`sendPushToUser`). `@@index([userId])` supports "send to all of this user's
devices".

### `WaitlistEntry` (`waitlist_entries`)

Captures brand-new Google sign-ups when the waitlist feature is active (see
`AppSetting` below). `email @unique` — re-signing-up with the same Google
account upserts rather than duplicating the waitlist row.

### `AppSetting` (`app_settings`)

```prisma
model AppSetting {
  key   String @id
  value String
}
```

A trivial key/value store for runtime-toggleable settings that shouldn't
require a deploy to change — today, only `WAITLIST_ACTIVE`
(`lib/waitlist/queries.ts`'s `WAITLIST_SETTING_KEY`). `value` is a plain
string (`"true"`/`"false"`) rather than a typed column because this table is
meant to stay generic — adding a new setting is just a new key, no migration.

## Enums

Grouped by the same sections as the schema file:

**Routine**
- `SessionType`: `NORMAL | INTENSE | PR_DAY | RECOVERY` — intensity label for
  "today's session".
- `MuscleGroup`: `CHEST | BACK | LEGS | SHOULDERS | ARMS | FULL_BODY | CARDIO
  | WOD | REST` — what a given day's training focuses on (used by both
  `User.todayMuscleGroup` and every day column on `WeeklyRoutine`).
- `RoutineTemplate`: `PUSH_PULL_LEGS | BRO_SPLIT | FULL_BODY_3 | UPPER_LOWER |
  ARNOLD_SPLIT | CUSTOM` — named starting templates offered during routine
  onboarding (not stored as a column on `WeeklyRoutine` itself — the template
  is only used client-side to pre-fill the day columns).

**Profile**
- `Gender`: `MALE | FEMALE | NON_BINARY | OTHER | PREFER_NOT_TO_SAY`.
- `FitnessGoal`: `MUSCLE_GAIN | FAT_LOSS | STRENGTH | ENDURANCE | FLEXIBILITY
  | GENERAL_FITNESS | SPORTS_PERFORMANCE`.
- `ExperienceLevel`: `BEGINNER | INTERMEDIATE | ADVANCED | EXPERT`.
- `Schedule`: `EARLY_MORNING | MORNING | MIDDAY | AFTERNOON | EVENING |
  NIGHT` — broad time-of-day training preference (distinct from the precise
  `ScheduleSlot.startTime`/`endTime`).
- `Discipline`: a large list of sports/activities (basketball, BJJ, boxing,
  calisthenics, climbing, crossfit, cycling, dance, functional, HIIT, judo,
  karate, kickboxing, martial arts, MMA, muay thai, other, padel, pilates,
  rowing, running, soccer, spinning, swimming, tennis, weightlifting, yoga,
  zumba) — shared between `User.disciplines` and `Event.disciplines`.
- `LookingFor`: `ACCOUNTABILITY_PARTNER | SPOTTER | RUNNING_BUDDY |
  TRAINING_PARTNER | MENTOR | MENTEE | WORKOUT_GROUP` — what kind of training
  relationship the user wants.

**Admin**
- `Role`: `USER | ADMIN`.

**Weekly Schedule**
- `DayOfWeek`: `MONDAY` … `SUNDAY`.

**Events**
- `EventType`: `CHALLENGE | CLINIC | COMPETITION | FUNDRAISER | MEETUP |
  OPEN_MAT | RETREAT | SEMINAR | SOCIAL | TOURNAMENT | WORKSHOP`.

**Matching**
- `SwipeDirection`: `LIKE | PASS`.

**Moderation**
- `ReportReason`: `FAKE_PROFILE | HARASSMENT | SEXUAL_CONTENT | SPAM |
  UNDERAGE | OFFENSIVE_BEHAVIOR`.
- `ReportStatus`: `PENDING | WARNED | BANNED | DISMISSED` — the lifecycle of
  a report as an admin reviews it (see
  `docs/backend-auth-realtime-security.md` for the full flow).
- `AppealStatus`: `PENDING | ACCEPTED | REJECTED` — the lifecycle of a ban
  appeal.

**Notifications**
- `NotificationType`: `NEW_MATCH | NEW_MESSAGE`.

## Migration history (changelog)

24 migrations, in chronological order. Skim this to understand how the
schema grew from an MVP dating app into what it is today:

1. **`20260516142513_init`** — initial schema: users, swipes, matches,
   conversations, messages, basic profile fields.
2. **`20260516180000_add-auth-fields`** — adds Supabase-auth linkage fields
   (`supabaseId`, etc.) to `User`.
3. **`20260516180001_birthdate-nullable`** — makes `birthDate` nullable (it
   is now set during onboarding step 2, not at signup).
4. **`20260516200000_add-profile-fields`** — adds the dating-profile
   attributes: goals, experience level, disciplines, looking-for, etc.
5. **`20260518000000_report_block_schema`** — introduces `Report` and
   `Block` — the first moderation primitives.
6. **`20260518212034_gym_specialization_schema`** — introduces `Gym` and
   links users to a gym.
7. **`20260812163730_add_storage_path_to_user_photo`** — adds
   `UserPhoto.storagePath` so photo deletion can also clean up Supabase
   Storage (previously only the public URL was stored, so the Storage object
   was orphaned on delete).
8. **`20260812202410_add_v1_1_workout_fields_and_onboarding_version`** — adds
   `weeklyFrequency`, `todayMuscleGroup`/`todaySessionType`, and
   `onboardingVersion` — the versioned-onboarding mechanism.
9. **`20260812224629_add_read_at_to_message`** — adds `Message.readAt` (read
   receipts / unread counts).
10. **`20260813013641_add_notifications`** — introduces the `Notification`
    model and `NotificationType` enum.
11. **`20260813155024_add_age_range`** — adds `User.minAge`/`maxAge` discovery
    filters.
12. **`20260813163127_add_schedule_slots`** — introduces `ScheduleSlot` and
    `DayOfWeek`.
13. **`20260813163942_add_events`** — introduces `Event`/`EventRsvp` and
    `EventType`.
14. **`20260813170329_add_event_disciplines_city`** — adds `Event.disciplines`
    and the denormalized `Event.city`.
15. **`20260813173937_add_more_event_types`** — expands `EventType` with more
    values.
16. **`20260813175804_add_more_disciplines`** — expands `Discipline` with
    more values.
17. **`20260813221817_add_push_subscriptions`** — introduces
    `PushSubscription` (Web Push).
18. **`20260813223331_add_user_role`** — adds `User.role` and the `Role`
    enum (admin access).
19. **`20260814103745_add_hide_profile_incognito_mode`** — adds
    `hideProfile`/`incognitoMode` visibility toggles.
20. **`20260814104716_add_report_status_and_user_ban`** — adds
    `Report.status`/`ReportStatus` and `User.bannedAt` — the ban mechanism.
21. **`20260814105455_add_appeals`** — introduces `Appeal`/`AppealStatus`.
22. **`20260814120607_add_report_evidence`** — adds `Report.evidence` (JSON) —
    the message-snapshot-before-cascade-delete mechanism.
23. **`20260814133411_add_waitlist`** — introduces `WaitlistEntry` and
    `AppSetting` — the waitlist gate.

(That's 23 numbered entries for the 24 migration folders — `migration_lock.toml`
itself is not a migration, just the provider lock file Prisma maintains
alongside the migrations directory.)

## The `prisma.config.ts` quirk

```ts
// packages/db/prisma.config.ts
export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "prisma/schema.prisma"),
  migrate: {
    async adapter() {
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const { default: pg } = await import("pg");
      const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
      return new PrismaPg(pool);
    },
  },
});
```

This config tells Prisma CLI commands (`migrate`, `db push`, `studio`) to use
a custom Postgres driver adapter (`@prisma/adapter-pg` + `pg`) instead of
Prisma's built-in query engine, connecting through `DIRECT_URL`.

**The quirk**: look at `packages/db/package.json` — neither `@prisma/adapter-pg`
nor `pg` is listed as a dependency (only `@prisma/client` and `prisma` are).
These two imports only resolve today because some *other* package in the
pnpm workspace happens to depend on them (pnpm's workspace node_modules
hoisting makes them resolvable from `packages/db` even without a direct
dependency declaration).

In practice this means:
- Running Prisma CLI commands from the monorepo root (as documented) works
  fine, because the hoisted `node_modules` includes these packages.
- If you ever try to run `packages/db` in isolation (its own install, a
  separate Docker build context that only copies `packages/db`, a different
  package manager, or pnpm's hoisting behavior changes), `prisma migrate` can
  fail with a module-not-found error for `@prisma/adapter-pg` or `pg`, because
  nothing in `packages/db`'s own manifest declares them.
- If you touch `prisma.config.ts` or start seeing "cannot find module
  '@prisma/adapter-pg'" errors, the fix is to add `@prisma/adapter-pg` and
  `pg` as explicit dependencies of `@gymatch/db` — don't just assume a reinstall
  will fix it, since the current setup is implicitly relying on hoisting.

## Running migrations and seeding locally

All commands are run from the repo root via pnpm's `--filter` flag, which
scopes the command to the `@gymatch/db` workspace package
(`packages/db/package.json`'s `name` field):

```bash
pnpm --filter @gymatch/db db:generate
pnpm --filter @gymatch/db db:push
pnpm --filter @gymatch/db db:seed
pnpm --filter @gymatch/db db:studio
```

What each one actually does, if you've never used Prisma:

- **`db:generate`** → runs `prisma generate`. Reads `schema.prisma` and
  generates the type-safe `@prisma/client` TypeScript client into
  `node_modules/.prisma/client` (or wherever your Prisma version puts it).
  This is a **code generation step, not a database operation** — it doesn't
  touch Postgres at all. You need to re-run this any time `schema.prisma`
  changes, otherwise `prismaAdmin.someNewField` won't type-check or exist at
  runtime.
- **`db:push`** → runs `prisma db push`. Compares `schema.prisma` to the
  actual database schema and directly alters the database (`CREATE TABLE`,
  `ALTER TABLE`, etc.) to match — **without** creating a migration file. This
  is meant for rapid local iteration/prototyping. It is *not* used for
  production changes (those go through versioned migration files in
  `prisma/migrations/`, created with `prisma migrate dev`, which the
  `db:migrate` script wraps). If you change the schema and want your local DB
  to catch up quickly without creating a new migration folder, this is the
  command to run.
- **`db:seed`** → runs `tsx prisma/seed.ts` with `DATABASE_URL` overridden to
  read `DIRECT_URL` out of `apps/web/.env.local` (see the script definition —
  it's a shell one-liner that greps the file). This populates your local
  database with realistic test data: roughly 20 users, 5 gyms in Buenos
  Aires, pre-made matches and conversations, so you don't have to manually
  create test accounts to see a populated UI.
- **`db:studio`** → runs `prisma studio`, a local web GUI (opens in your
  browser) that lets you browse and edit every table directly — useful for
  quickly checking "did that row actually get created" without writing SQL
  or a one-off script.

Typical first-time setup order (same as the README Quick Start): `db:generate`
→ `db:push` → `db:seed` → `pnpm dev`.
</content>
