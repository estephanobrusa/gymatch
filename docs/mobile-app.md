# Mobile App (`apps/mobile`)

Onboarding doc for anyone joining the mobile side of Gymatch. If you've worked on `apps/web`
(Next.js App Router) this will feel familiar: Expo Router uses the same file-based routing
convention, just for React Native screens instead of pages.

## 1. Why a REST API exists just for mobile

On web, most mutations and reads go through **Next.js Server Actions** — functions marked
`"use server"` that the client calls like regular async functions, but which actually execute an
RPC call under the hood. Server Actions are a Next.js-specific mechanism: they rely on Next.js's
bundler wiring and the browser's `fetch`/form-action machinery. **React Native cannot call a
Server Action.** There's no Next.js runtime on the device, and no way to wire up the client-side
half of that RPC protocol in RN.

So mobile needs a plain, normal API to talk to. That's `apps/web/src/app/api/v1/*` — a set of
Next.js Route Handlers (`route.ts` files) that wrap the **exact same business logic** the Server
Actions call on web. For example, `apps/web/src/app/api/v1/swipe/route.ts` calls
`recordSwipeForUser` from `apps/web/src/lib/swipe/service.ts` — the same `service.ts` that the
swipe Server Action calls. The REST layer is a thin adapter around shared service functions, not a
parallel implementation. Both web and mobile end up running identical business logic; only the
transport (Server Action vs. HTTP route) differs.

Authentication also differs out of necessity: web Server Actions run in the same origin as the
browser, so they read the Supabase session from a cookie. Mobile has no browser and no cookie
jar, so every REST request instead carries `Authorization: Bearer <supabase-access-token>`, and
each route handler resolves the user from that bearer token.

**`apps/mobile/src/lib/api/client.ts`** is the mobile-side counterpart to this API:

- `apiFetch<T>(path, options)` — the low-level typed fetch wrapper. Builds the request against
  `getApiBaseUrl()` (see §4 "base-url.ts"), attaches the bearer token if present, parses the JSON
  body, and throws `ApiError` (carrying HTTP `status` + the backend's `{ error }` message) on a
  non-2xx response.
- A typed helper per endpoint — `getMe`, `getDiscoveryFeed`, `recordSwipe`, `getMatches`,
  `getMessages`, `sendMessage`, `markRead`, `unmatch`, `authSync` — each one just a thin, typed
  wrapper around `apiFetch` for one `/api/v1/*` route. If you need a new endpoint on mobile, add
  the matching helper here rather than calling `apiFetch` ad hoc from a component.

## 2. Project structure (`apps/mobile/src`)

Expo Router maps the `app/` folder straight to screens/routes, the same mental model as
`apps/web/src/app/` on the web side (route groups in parentheses don't appear in the URL; they're
purely organizational).

```
app/
  _layout.tsx                    # root Stack + QueryClientProvider + GestureHandlerRootView +
                                  # OAuth deep-link listener + session-based redirect to (tabs) or (auth)/login
  (auth)/login.tsx                # sign-in screen (Google OAuth button)
  (tabs)/
    _layout.tsx                   # bottom Tabs: Discover, Matches, Profile
    index.tsx                     # Discovery screen (CardStack + MatchModal + ProfileModal)
    matches.tsx                   # matches list
    profile.tsx                   # SCAFFOLD ONLY — just email + sign-out, no editing
  matches/[conversationId].tsx    # full chat screen, NOT realtime (manual invalidateQueries)
components/
  swipe/   ActionButtons, CardStack, MatchModal, ProfileModal, SwipeCard
  chat/    MatchesList, MessageBubble
hooks/     use-auth.ts, use-discovery.ts
lib/       api/base-url.ts, api/client.ts, auth/oauth.ts, debug-log.ts, format.ts, labels.ts, supabase.ts
theme.ts
```

A few structural notes:

- `app/_layout.tsx` is the root: it mounts the Stack navigator, wraps everything in
  `QueryClientProvider` and `GestureHandlerRootView`, listens for OAuth deep links (`gymatch://`
  scheme) via `expo-linking`, and redirects to `(tabs)` or `(auth)/login` based on whether a
  Supabase session exists — this is the mobile equivalent of a web middleware auth redirect.
- There is **no `(onboarding)` route group**. See §3 — mobile currently assumes the user already
  completed onboarding on web.

## 3. What's implemented vs. what's missing

Be honest with yourself about this list before picking up a mobile ticket — a good chunk of the
app is scaffold only.

**✅ Fully implemented (the core swipe/match/chat loop):**

- **Discovery / swipe** — `CardStack.tsx` drives a draggable card deck with
  `react-native-reanimated` + `react-native-gesture-handler`, backed by the shared
  `useSwipeStore` from `@gymatch/core` (same store web uses).
- **Matches list** — `MatchesList.tsx` + `(tabs)/matches.tsx`.
- **Chat** — send, mark-read, unmatch, and infinite-scroll pagination of older messages all work.
  **It is not realtime.** Web subscribes to a Supabase Realtime channel for live message updates;
  mobile instead calls `queryClient.invalidateQueries(["messages", ...])` /
  `invalidateQueries(["matches"])` right after a send or a read, which refetches once. If two
  people are chatting live, neither phone will see the other's message appear until it refetches
  (next send, next mount, or a pull-to-refresh if one is ever added).
- **Auth** — native Google OAuth via a `gymatch://` deep link +
  `WebBrowser.openAuthSessionAsync` + a manual `supabase.auth.setSession(...)` call. This is more
  involved than web's OAuth, which just redirects through a server-side callback route and lets
  the browser handle the cookie exchange. RN has no browser-managed cookie jar, so the tokens have
  to be pulled out of the redirect URL by hand and applied to the client explicitly. See
  `lib/auth/oauth.ts` and §5 below.

**❌ Scaffold-only or entirely missing:**

- **Profile editing** — `(tabs)/profile.tsx` only shows the user's email and a sign-out button.
  No photo management, no bio/fitness-level editing, no privacy toggles, no schedule slots.
- **Events** — no event screens at all, even though `apps/web/src/app/api/v1/events/*` exists
  server-side.
- **Notifications** — no notifications screen.
- **Moderation (report/block)** — the REST endpoints
  (`/api/v1/moderation/report`, `/api/v1/moderation/block`) exist server-side, but nothing on
  mobile calls them yet. There's no "Report" or "Block" button anywhere in the mobile UI.
- **Onboarding** — no `(onboarding)` route group. Mobile assumes the user already went through
  onboarding on web before ever opening the app on their phone.

If you're asked to build one of the "missing" items, treat the equivalent web feature +
its `/api/v1/*` route as the spec to follow — the backend contract is almost always already there.

## 4. Mobile-specific gotchas

**`CardStack.tsx` — reanimated SharedValues vs. the React Compiler lint rule**

```
/* eslint-disable react-hooks/immutability -- reanimated SharedValues are
   intentionally mutable; the React Compiler lint rule cannot model them. */
```

`react-native-reanimated`'s `useSharedValue` pattern mutates a `.value` property directly
(`tx.value = 0`, `rotate.value = withSpring(0)`, etc.). The React Compiler's lint rule flags any
direct mutation of what looks like component state as a violation, because normally mutating state
outside `setState` breaks React's render model. SharedValues are the deliberate exception: they
live outside React's render cycle entirely (on the UI thread, read by Reanimated's worklets), so
mutating `.value` is the correct, intended API — not a bug the linter should catch. Hence the
file-level disable.

**`lib/auth/oauth.ts` — heavy `debug-log.ts` instrumentation**

Nearly every step of the OAuth flow (`signInWithGoogle`, `createSessionFromUrl`) logs through
`addLog` from `lib/debug-log.ts`. This isn't decorative — the native OAuth deep-link flow was
historically hard to debug on a real device (no browser devtools, no easy breakpoints across the
app → in-app-browser → app round trip), so every transition is logged: the computed redirect URI,
the authorize URL Supabase returned, the result type from `WebBrowser.openAuthSessionAsync`, the
parsed query params, and so on.

The flow has a specific, easy-to-hit failure mode, called out right in the code comment: the
`gymatch` redirect URI (`Linking.createURL("/")`) **must exactly match a Redirect URL registered
in the Supabase dashboard**. If it doesn't, Supabase does not error — it silently falls back to
the project's web **Site URL** (e.g. `localhost:3000`), and the OAuth flow opens a browser pointed
at the web app instead of handing control back to the native app. This looks like "OAuth is
broken" with no error message, when the real problem is a dashboard config mismatch. If you ever
see the in-app browser not closing and redirecting to a `localhost:3000` page instead of
returning to the app, check the Supabase dashboard redirect URLs first.

**`lib/api/base-url.ts` — deriving the dev machine's LAN IP**

A physical phone running the app over WiFi (not an emulator) cannot reach `http://localhost:3000`
— on the phone, `localhost` means *the phone itself*, not your laptop running `pnpm dev`. To make
local development work without manually typing your machine's LAN IP, `getApiBaseUrl()` derives it
automatically from Expo's dev server metadata (`Constants.expoConfig.hostUri`, which looks like
`192.168.1.10:8081` when Metro is running). Resolution order:

1. `EXPO_PUBLIC_API_URL` env var, if set (prod domain, or an explicit manual override).
2. Dev only — derive the LAN host from Expo's `hostUri` and point it at the API port.
3. Fall back to `localhost` (fine for web/simulator, where `localhost` *does* mean the dev
   machine).

This is a very common new-mobile-dev trap: if your phone can't reach the API and web works fine,
check whether `EXPO_PUBLIC_API_URL` is accidentally set to `localhost`, or whether your phone and
dev machine are even on the same WiFi network.

**Known bug: the REWIND feature flag never activates on mobile**

`packages/core/lib/swipe/feature-flags.ts`'s `isFeatureEnabled(flag, prefix)` takes an explicit
env-var prefix because web and mobile inline env vars under different names (`NEXT_PUBLIC_*` on
web, `EXPO_PUBLIC_*` on Expo/Metro). `CardStack.tsx` gets this right for the *visibility* check:

```ts
const showRewind = useMemo(() => isFeatureEnabled("REWIND", "EXPO_PUBLIC_"), []);
```

But the actual rewind *action*, in the shared store (`packages/core/stores/swipe.store.ts`),
calls it without the prefix:

```ts
rewind: () =>
  set((s) => {
    if (!isFeatureEnabled("REWIND")) return;
    ...
```

Because no prefix is passed, this defaults to `FEATURE_FLAG_PREFIX = "NEXT_PUBLIC_"` — i.e. it
checks `process.env.NEXT_PUBLIC_FEATURE_REWIND`, a web-only env var that will never be set in an
Expo build. The practical symptom: if `EXPO_PUBLIC_FEATURE_REWIND=true` is set, the mobile UI will
correctly *show* the rewind button, but tapping it silently does nothing, because the store-level
check always evaluates to disabled. See the code comment added at the `rewind()` call site for the
one-line fix. See `docs/architecture-overview.md` for the full Server Actions vs. REST API design
and `docs/frontend-web-app.md` for how web uses `isFeatureEnabled` — this doc is just the
mobile-side symptom of it.

## 5. Expo / React Native version info

| Package                        | Version    |
| ------------------------------- | ---------- |
| Expo SDK                        | 57         |
| `expo-router`                   | 57.0.12    |
| `react`                          | 19.2.3     |
| `react-native`                   | 0.86.2     |
| `react-native-reanimated`        | 4.5.1      |
| `react-native-gesture-handler`   | ~2.32.0    |
| `react-native-worklets`          | 0.10.1     |
| `@tanstack/react-query`          | ^5.101.4   |
| `@supabase/supabase-js`          | ^2.112.3   |

`app.json` highlights:

- `scheme: "gymatch"` — the deep-link scheme used for the OAuth redirect (`gymatch://`).
- `ios.bundleIdentifier` / `android.package`: `com.gymatch.app`.
- `experiments.typedRoutes: true` — Expo Router generates typed route params from the `app/`
  folder structure.
- `web.output: "static"` — Expo can also build a static web export of this app (separate from
  `apps/web`, not something this doc covers in detail).

## 6. Running the mobile app locally

From the repo root, using the workspace filter:

```bash
pnpm --filter apps/mobile start       # expo start — scan the QR code with Expo Go, or press i/a
pnpm --filter apps/mobile typecheck   # tsc --noEmit
pnpm --filter apps/mobile lint        # expo lint
```

There is currently **no mobile test suite** — no `test` script in `apps/mobile/package.json`, and
no `*.test.ts`/`*.test.tsx` files anywhere under `apps/mobile/src`. Until that changes, `typecheck`
+ `lint` + manual testing on a device/simulator are the only verification tools available for a
mobile change. Run both before opening a PR, and actually exercise the screen you touched on a
device or simulator — don't rely on typecheck passing as proof the feature works.

## 7. Sharing code with web via `@gymatch/core`

Mobile and web both depend on the `@gymatch/core` workspace package for shared types, utilities,
and Zustand stores, so business logic and state shape stay identical across platforms. A few
concrete examples from this app:

- `hooks/use-discovery.ts` imports `useSwipeStore` from `@gymatch/core` — the exact same store
  `apps/web`'s discovery screen uses. Mobile just feeds it data from its own
  `getDiscoveryFeed` REST call instead of a Server Action.
- `components/swipe/CardStack.tsx` imports `isFeatureEnabled`, `useSwipeStore`, and the
  `DiscoveryCard` / `SwipeDirection` types from `@gymatch/core` — the swipe gesture logic is
  mobile-specific (reanimated), but the data model and the store it mutates are shared.
- `lib/api/client.ts` imports its response types (`ChatMessage`, `ConversationPage`,
  `DiscoveryCard`, `MatchPreview`, `ProfileUser`, `SwipeDirection`, `SwipeResult`) from
  `@gymatch/core`, so the mobile REST client and the web Server Actions agree on exactly the same
  shapes without mobile needing its own copy of these types.

See `docs/shared-core-package.md` for the full breakdown of what lives in `@gymatch/core` and why.
