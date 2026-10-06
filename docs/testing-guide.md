# Testing Guide

How testing works across the monorepo, what's covered, and what isn't. Read this once before
you write or run your first test, and again before opening your first PR.

## `apps/web`

Vitest is the test runner. The default test `environment` is `"node"` — most tests here are
server actions, services, or plain utility functions and don't need a DOM, so running them in
Node is faster. Tests that *do* need a DOM (component tests using React Testing Library) opt in
per-file with a magic comment at the top of the file:

```ts
// @vitest-environment jsdom
```

This per-file opt-in (rather than making `jsdom` the default) keeps the bulk of the suite fast,
since most of the backend-ish logic in this app doesn't render anything.

There's a shared `vitest.setup.ts` for global test setup, and the `@` path alias resolves to
`./src`, matching the app's own import convention.

### Pattern 1 — unit test with factory-based mocks

Example: `lib/swipe/actions.test.ts`. It mocks `next/navigation`, `@/lib/auth`, and
`@/lib/auth/admin` using `vi.mock(...)` with a **factory function**:

```ts
vi.mock("@/lib/auth/admin", () => ({
  prismaAdmin: { $transaction: vi.fn() },
}));
```

Why factory-based and not a plain object reference: Vitest hoists `vi.mock()` calls to the top
of the file, above your imports — that's how it can intercept the module before anything else
loads it. That means the mock factory **cannot reference variables declared later in the file**
(or most outer-scope variables at all) — if you try, you'll get a confusing
"Cannot access 'X' before initialization" error. This trips up almost everyone the first time.
The fix is always the same: define everything the mock needs *inside* the factory function
itself, or reference a `vi.hoisted(...)` value if you truly need to share state.

After mocking the dependencies, the test imports the *real* function under test and asserts
against the mocked `prismaAdmin.$transaction` callback to verify the actual business logic
runs the transaction it's supposed to.

### Pattern 2 — component/integration test asserting realtime configuration

Example: `components/chat/__tests__/ChatWindow.test.tsx`. Instead of only asserting visible
behavior, it inspects the exact arguments passed to the Supabase realtime subscription call —
checking things like `options.event === "DELETE"` and `options.table === "blocks"`. This tests
the **channel configuration itself**, not just what renders on screen. That's a useful pattern
to reuse: for anything wired to Supabase Realtime, a rendering-only test can pass even if the
subscription is listening on the wrong table or event, so asserting the subscription args
directly catches a whole class of silent realtime bugs that behavioral tests miss. See
[`backend-auth-realtime-security.md`](./backend-auth-realtime-security.md) for the related
publication gotcha this kind of test can't catch.

Per the root README, `apps/web` currently has 48 Vitest files and 432 unit/integration tests.

## `apps/web/e2e` (Playwright)

Config highlights:
- `testDir: "./e2e"`
- `fullyParallel: false`, `workers: 1` — tests run sequentially
- Mobile viewport by default: 390×844, iPhone 14 user agent
- 3 projects:
  - `setup` — creates an authenticated storage state
  - `authenticated` — depends on `setup`, reuses the saved storage state
  - `public` — needs no auth at all

Spec files currently in the repo:
- `auth.setup.ts`
- `authenticated.auth.spec.ts`
- `public.public.spec.ts`

`authenticated.auth.spec.ts` gracefully calls `test.skip()` when the `E2E_USER_EMAIL` /
`E2E_USER_PASSWORD` environment variables aren't set, rather than failing. This matters because
e2e tests that need a real seeded account shouldn't hard-fail in environments (like a fresh
clone, or CI without secrets configured) that don't have that account set up — skipping is the
correct behavior there, not a bug.

## `apps/mobile`

There are currently no test files in `apps/mobile`, and no `test` script in its
`package.json`. Verification today is `typecheck` + `lint` + manual device testing only. This
is a real gap, not a hidden one — flagging it here so it's not a surprise, and so it's an
obvious area to contribute to if you're looking for a meaningful first task. See
[`mobile-app.md`](./mobile-app.md) for the current state of the app this would be testing.

## `packages/core`

Has its own `vitest.config.ts` and 5 test files covering routine utils, event distance math,
swipe feature flags, the swipe Zustand store, and the age filter. Full list in
[`shared-core-package.md`](./shared-core-package.md#testing).

## Running everything

From the repo root:

- `pnpm test` — runs the web test suite
- `pnpm test:watch` — watch mode
- `pnpm e2e` — Playwright e2e tests
- `pnpm e2e:ui` — Playwright in UI mode
- `pnpm lint` — lints every package (`pnpm -r`)
- `pnpm typecheck` — typechecks every package (`pnpm -r`)

## Before opening a PR

At minimum, run lint, typecheck, and the relevant test suite for whatever you touched. If your
change touches anything realtime/Supabase-related, also manually verify it against a real
Supabase project — the unit tests mock the Supabase client, so they cannot catch the realtime
publication gotcha described in
[`backend-auth-realtime-security.md`](./backend-auth-realtime-security.md). A test suite that
passes fully green is not proof that realtime actually fires in a real environment.
