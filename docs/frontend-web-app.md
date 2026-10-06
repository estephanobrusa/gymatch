# Frontend: `apps/web`

This document is a tour of the `apps/web` Next.js application — the web client for Gymatch.
It's written for someone who has used React before but may be new to the Next.js **App
Router**, **Server Components**, and **Server Actions**. If you've only built client-side SPAs,
read the "why" explanations carefully — the mental model here is genuinely different from a
classic CRA/Vite React app.

If a term below ("Server Component", "Server Action") is unfamiliar, don't worry — each section
explains it the first time it matters. You don't need to read the official Next.js docs to
follow this file, but you'll want to eventually.

---

## 1. App Router structure (`apps/web/src/app`)

### The core idea: route groups

In the App Router, a **route** is a folder containing a `page.tsx`. The URL path is derived
from the folder path. A **route group** is a folder wrapped in parentheses, e.g. `(protected)`
— the parentheses tell Next.js "this folder exists for organization only, do not add it to the
URL." So `app/(protected)/matches/page.tsx` serves `/matches`, not `/(protected)/matches`.

Why bother with route groups at all? Because a folder can also hold a `layout.tsx`, and a
layout wraps every page underneath it. Route groups let you apply a **shared layout — and
shared server-side guards — to a whole family of pages without that grouping leaking into the
URL.** That's exactly how this app enforces auth: instead of repeating an auth check in every
page component, the check lives once in the route group's `layout.tsx`.

There are three "zones" in this app:

- **`(protected)/`** — pages a logged-in, non-banned, fully-onboarded user can see. Gated by a
  **3-layer check** in `(protected)/layout.tsx` (Supabase session → ban status → onboarding
  completeness). The full gate mechanics (why 3 layers, what each one catches, and how it
  interacts with the Edge middleware) are documented in
  `docs/backend-auth-realtime-security.md` — this file won't repeat them.
- **`(admin)/`** — internal admin screens, gated by `requireAdmin()` in `(admin)/layout.tsx`.
  A completely separate, much stricter check than `(protected)`.
- **Top-level routes** (no group) — pages that must be reachable *before* or *outside* the
  normal protected flow: login, onboarding, ban notice, waitlist, auth callback.

#### `(admin)/` — gated by `requireAdmin()`

| Page | Purpose |
|---|---|
| `dashboard/page.tsx` | Admin landing page / overview. |
| `reports/page.tsx` | Review user-submitted moderation reports. |
| `appeals/page.tsx` | Review ban appeals submitted by users. |

#### `(protected)/` — gated by the 3-layer layout

| Page | Purpose |
|---|---|
| `page.tsx` | The app's home screen: the discovery/swipe feed. |
| `matches/page.tsx` | List of the user's matches/conversations. |
| `matches/[conversationId]/` | A single chat conversation with another matched user. |
| `profile/page.tsx` | View your own profile as others see it. |
| `profile/edit/` | Edit profile fields, photos, and privacy settings. |
| `events/page.tsx` | Browse gym meetup events. |
| `events/new/` | Create a new event. |
| `events/[id]/` | Event detail page (view, RSVP, delete if owner). |
| `notifications/page.tsx` | Full notifications list (the bell in the top bar is a preview of this). |

#### Top-level routes

| Page | Purpose |
|---|---|
| `login/page.tsx` | Sign-in screen (unauthenticated users land here). |
| `banned/page.tsx` | Shown instead of the app when the protected layout detects `bannedAt` is set. |
| `waitlist/page.tsx` | Shown to users waiting for access (feature-flagged rollout). |
| `onboarding/username/page.tsx` | Onboarding step 1: choose a username. |
| `onboarding/birthdate/page.tsx` | Onboarding step 2: enter birthdate (age-gating lives here). |
| `onboarding/photo/page.tsx` | Onboarding step 3: upload a profile photo. |
| `onboarding/fitness/page.tsx` | Onboarding step 4: fitness preferences/goals. |
| `onboarding/routine/page.tsx` | Onboarding step 5: gym routine details. |
| `auth/callback/route.ts` | OAuth/magic-link callback endpoint that completes the Supabase auth flow. |

**The onboarding wizard pattern.** Onboarding is a **linear, single-step-per-page wizard**: each
page under `onboarding/` handles exactly one piece of profile data and nothing else. There's no
single multi-step form component juggling five steps of state — instead, `getOnboardingStatus()`
(used by the `(protected)` layout) computes which step is missing and redirects there. This
means:

- Each page is simple and independently testable (see the `__tests__/` folders next to each
  step).
- Users can leave mid-onboarding and resume exactly where they stopped — the "current step" is
  derived from the database, not from client state.
- If you add a 6th onboarding field, you add a 6th page + update the status-derivation logic,
  you don't touch the other five pages.

#### `api/v1/*`

These routes exist so the **mobile app** has a stable REST-ish surface to call, since mobile
can't invoke Next.js Server Actions directly. If you're working purely on the web app, you
generally won't touch these — prefer calling Server Actions from Server/Client Components
instead. Full request/response contracts are documented in
`docs/backend-auth-realtime-security.md`.

---

## 2. Components directory (`apps/web/src/components`)

Components are organized **by domain/feature**, not by component type. This matters: when
you're working on chat, everything chat-related lives in one folder — you don't hunt across a
`containers/`, `components/`, `views/` split.

| Folder | Key components | Purpose |
|---|---|---|
| `swipe/` | `DiscoveryPage`, `CardStack`, `SwipeCard`, `ActionButtons`, `MatchModal`, `ProfileDrawer` | The swipe/discovery experience — card stack, swipe gestures, match celebration, profile preview drawer. |
| `chat/` | `ChatWindow`, `MatchesList` | `ChatWindow` is a single conversation with realtime message/match/block/ban subscriptions (see §3). `MatchesList` renders the conversation list. |
| `notifications/` | `NotificationBell`, `NotificationsList` | `NotificationBell` is the top-bar badge: realtime push for new notifications, plus a 60-second poll as a fallback in case the realtime channel drops. `NotificationsList` renders the full list. |
| `profile/` | `ProfileEditForm`, `PhotoManager`, `PrivacyToggles`, `ProfilePreview`, `DeleteAccountButton`, `ThemeToggle` | `PhotoManager` handles upload, reorder, and delete of profile photos with a hard 6-photo cap. The rest are self-explanatory profile-editing UI. |
| `events/` | `EventForm`, `RsvpButton`, `DeleteEventButton` | Create/edit an event, RSVP to one, delete one (owner only). |
| `moderation/` | `ReportModal`, `BlockConfirmDialog`, `UnmatchConfirmDialog`, `BlockedUsersList` | User-facing moderation actions: report, block, unmatch, and the blocked-users management list. Used from `ChatWindow`'s three-dot menu, among other places. |
| `admin/` | `AppealForm`, `AppealReviewCard`, `ReportReviewCard`, `WaitlistToggle`, `BroadcastForm` | Admin-only tooling: review appeals/reports, toggle waitlist mode, send broadcast messages. |
| `layout/` | `TopBar`, `BottomNav` | App chrome. `BottomNav` has exactly 3 tabs — keep it that way unless there's a deliberate product decision to change the IA. |
| `push/` | `PushPermissionBanner`, `PushSettings` | Web Push opt-in banner and settings toggle. |
| `gym/` | `GymSearch` | Gym lookup/search (used in profile and onboarding flows). |
| `onboarding/` | `PhotoUploader` | The photo-upload widget specifically for the onboarding photo step (distinct from `profile/PhotoManager`, which manages an existing multi-photo gallery). |
| `ui/` | `button`, `dialog`, `alert-dialog` | Small, local, shadcn-style wrappers around Radix primitives. **This is intentionally not a full shadcn/ui install** — just the handful of primitives this app actually needs. If you need a new primitive (e.g. a `Select`), add it here following the same pattern (Radix + `cn()` + Tailwind), don't reach for a different UI kit. |
| `seo/` | `JsonLd` | Structured data (`application/ld+json`) injection for SEO. |

---

## 3. State management

This codebase intentionally uses **two different state tools for two different jobs**, plus a
third pattern for calling the backend. Understanding *why* each one is used where will save you
from reaching for the wrong tool.

### 3a. TanStack Query — for server data

TanStack Query (React Query) owns anything that originates from the server and benefits from
caching, background refetching, and request deduplication.

**Setup.** `app/providers.tsx` wraps the app in `QueryClientProvider`:

```tsx
// app/providers.tsx
export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient();
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

**Client construction.** `lib/query-client.ts` builds the actual `QueryClient`, and it does it
differently depending on whether code is running on the server or in the browser:

```ts
// lib/query-client.ts
export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    // Server: a brand-new client every call.
    return new QueryClient({ defaultOptions: { queries: { staleTime: 60 * 1000 } } });
  }
  // Browser: one singleton, reused across the whole tab session.
  if (!queryClient) {
    queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60 * 1000 } } });
  }
  return queryClient;
}
```

Why the split? On the **server**, every request runs in isolation — there's no "tab" or
"session" concept, so a shared/global `QueryClient` would leak one user's cached data into
another user's request. A fresh client per request keeps the server stateless and safe. In the
**browser**, there's exactly one long-lived page session, so reusing a single client lets the
cache survive across route navigations — you don't refetch data you already have just because
you clicked a link. `staleTime: 60_000` means fetched data is considered fresh for 60 seconds
before TanStack Query will refetch it in the background.

**Canonical example — `useDiscoveryFeed()`** (`lib/swipe/hooks.ts`):

```ts
export function useDiscoveryFeed() {
  const appendCards = useSwipeStore((s) => s.appendCards);

  const query = useInfiniteQuery({
    queryKey: ["discovery-feed"],
    queryFn: ({ pageParam }) => getDiscoveryFeedAction(pageParam ?? undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  // TanStack Query v5 removed the onSuccess callback, so syncing fetched
  // pages into another store (Zustand, here) is done via useEffect instead.
  useEffect(() => {
    const lastPage = query.data?.pages.at(-1);
    if (lastPage) appendCards(lastPage.cards);
  }, [query.data?.pages, appendCards]);

  return { /* ...subset of query state consumers need */ };
}
```

This is the pattern to copy for any "paginated server data that also needs to live in a
client-side store": use `useInfiniteQuery` for the fetching/caching/pagination mechanics, and a
`useEffect` to push newly-arrived pages into Zustand.

### 3b. Zustand + immer — for client-only UI state

`packages/core/stores/swipe.store.ts` (`useSwipeStore`) owns state that is **not** server data —
it's ephemeral UI state describing what's currently happening on screen: which cards are in the
stack, whether a match modal should show, whether a swipe animation is in flight.

**State shape:**

```ts
interface SwipeStore {
  stack: DiscoveryCard[];       // cards currently queued to show
  currentMatch: SwipeResult | null; // set when a swipe results in a match
  isAnimating: boolean;          // true while a swipe animation/request is in flight
  lastSwiped: DiscoveryCard | null; // most recently removed card, for rewind
  // actions: loadStack, appendCards, swipe, clearMatch, rewind
}
```

**Actions**, briefly:

- `loadStack(cards)` — replace the stack (e.g. after an initial fetch).
- `appendCards(cards)` — append new cards, de-duplicated by id (used by `useDiscoveryFeed`).
- `swipe(direction, action)` — the interesting one. It **optimistically** removes the top card
  from the stack immediately, then calls `action()` (the server action that actually records the
  swipe). If `action()` throws, the card is put back (`s.stack.unshift(removed)`) — a manual
  rollback.
- `clearMatch()` — dismiss the match modal.
- `rewind()` — put the last swiped card back on top of the stack. Gated behind
  `isFeatureEnabled("REWIND")` — it's a feature-flagged "undo" capability, not a universally
  available one.

**The immer gotcha you need to know before touching this file.** `swipe()` does this:

```ts
set((s) => {
  if (s.isAnimating || s.stack.length === 0) return;
  s.isAnimating = true;
  const draftCard = s.stack.shift();
  if (draftCard) {
    removed = current(draftCard); // <- not optional, read on
    s.lastSwiped = removed;
  }
});
```

`s.stack.shift()` returns an immer **draft** (a Proxy), not a plain object. Once the `set()`
recipe function returns, immer **revokes** every draft proxy created during that recipe — any
later attempt to read from it throws `TypeError: Cannot perform 'get' on a proxy that has been
revoked`. Since `removed`/`lastSwiped` need to survive past the end of this `set()` call (the
`catch` block below reads `removed`, and `rewind()` reads `lastSwiped` in a future, unrelated
tick), they **must** be unwrapped to plain objects with immer's `current()` before the recipe
ends. This is exactly what the in-file comment at that line explains — if you add new
Zustand+immer state that needs to outlive its `set()` call, you'll hit this same trap unless you
remember to call `current()` first.

### 3c. Server Actions — calling the backend directly, two ways

Next.js **Server Actions** are async functions marked `"use server"` that you can import and
call from a Client Component *as if they were local functions* — no `fetch`, no API route, no
manual `JSON.stringify`. Next.js handles the network call for you under the hood. In this
codebase, Server Actions **are** the RPC layer between the browser and the backend for
first-party web usage (the `api/v1/*` REST routes exist only for mobile).

There are two valid patterns for calling them, used depending on what you need:

**Pattern A — wrap in a TanStack Query mutation**, when you want cache invalidation/retry/shared
pending state. Example, `useSwipeAction()` (`lib/swipe/hooks.ts`):

```ts
export function useSwipeAction() {
  const mutation = useMutation({
    mutationFn: ({ toId, direction }: { toId: string; direction: SwipeDirection }) =>
      recordSwipe(toId, direction), // <- a Server Action, called directly
  });
  return { mutate: mutation.mutate, mutateAsync: mutation.mutateAsync, isPending: mutation.isPending };
}
```

**Pattern B — `useTransition` + local optimistic state**, when the result only needs to update
*this* component's local state and there's nothing to invalidate elsewhere. Example,
`ChatWindow.tsx`'s send-message flow:

```tsx
const [isPending, startTransition] = useTransition();

function handleSend() {
  // ...
  startTransition(async () => {
    const created = await sendMessageAction(conversationId, trimmed); // Server Action
    setMessages((prev) => [...prev, created]);
  });
}
```

Both are correct. Reach for **Pattern A (TanStack Query)** when other parts of the UI need to
know about the result (shared cache), or when you want built-in retry/error state. Reach for
**Pattern B (`useTransition`)** when the mutation's effect is purely local to one component and
you don't need a query cache involved at all — it's simpler and has less ceremony for that case.

---

## 4. Styling

Tailwind is configured in two layers:

- `packages/config/tailwind.config.base.ts` — the **shared base** (used by any app in the
  monorepo that needs Tailwind): brand color scale, font families.
- `apps/web/tailwind.config.ts` — extends the base config and adds the shadcn-style semantic
  tokens (`border`, `background`, `primary`, `muted`, `card`, etc.) that map to CSS variables
  (`hsl(var(--primary))` and friends). This is the design-system layer: components should
  reference `bg-primary`, `text-muted-foreground`, etc., not raw colors, so theming (light/dark)
  works for free.

**The brand color** — coral, `#f43f5e` — lives at `brand.500` in
`packages/config/tailwind.config.base.ts`, with the full 50–950 scale around it (`brand-600` is
the most commonly used shade for buttons/accents, e.g. in `SwipeCard` and `ChatWindow`).

---

## 5. PWA

This app is an installable Progressive Web App:

- **`src/sw.ts`** — the service worker source, written against
  [Serwist](https://serwist.pages.dev/) (a maintained Workbox-successor built for Next.js). It's
  compiled at build time into **`public/sw.js`**, the file the browser actually registers.
- **`public/manifest.json`** — the web app manifest (name, icons, theme color, display mode)
  that tells the browser/OS how to present the app when installed.

Together, these two give the app two things a normal website doesn't have: it can be **installed**
to a home screen/dock like a native app, and it can serve a cached **offline app shell** plus
handle Web Push notifications (see the `push` event handler in `sw.ts`) even when no tab is
open. You generally won't need to touch `sw.ts` unless you're changing push notification
behavior or cache strategy.

---

## 6. Hooks — generic vs. domain-specific

There are two places hooks live in this codebase, and the distinction is deliberate:

- **`hooks/`** — generic, reusable hooks with no domain knowledge. Example: `hooks/use-drag.ts`
  implements a pointer-based drag gesture (`deltaX`, `isDragging`, pointer event bindings) with
  zero knowledge of swipe cards, matches, or any business concept. It's used by `SwipeCard`, but
  it could just as easily power a carousel or a slider somewhere else.
- **`lib/<domain>/hooks.ts`** — hooks that *are* tied to a specific domain, co-located with that
  domain's server actions and types. Example: `lib/swipe/hooks.ts` contains
  `useDiscoveryFeed()`, `useSwipeAction()`, `useMatchNotification()` — all swipe-specific, all
  living right next to `lib/swipe/actions.ts` and `lib/swipe/types.ts`.

**Rule of thumb:** if a hook would still make sense with all references to Gymatch concepts
(swipe, match, event, profile...) deleted, it belongs in `hooks/`. If it's fundamentally "the
swipe feature's React glue," it belongs in `lib/swipe/hooks.ts` (or that domain's equivalent).

---

## 7. First PR walkthroughs

### Adding a new page

1. Decide which zone it belongs to: does it need the 3-layer `(protected)` gate, the
   `(admin)` gate, or neither (top-level)? Create the folder under the matching group, e.g.
   `app/(protected)/settings/page.tsx`.
2. If the page needs server data before first paint, fetch it directly in the page component
   (it's a Server Component by default — no `useEffect`/loading spinner needed for the initial
   load). Pass that data down as props to any Client Components that need interactivity.
3. If the page needs client-side interactivity (forms, buttons with handlers, realtime,
   animation), build that part as a separate component in `components/<domain>/` marked
   `"use client"` at the top — don't mark the whole page Server Component as client just because
   one button needs an `onClick`.
4. Decide where state goes using §3 above: server data → TanStack Query hook in
   `lib/<domain>/hooks.ts`; pure client UI state shared across components → a Zustand store;
   local-only state → plain `useState` in the component.
5. To mutate something, write (or reuse) a Server Action in `lib/<domain>/actions.ts` and call it
   directly from the Client Component — either wrapped in a `useMutation` (Pattern A) or a
   `useTransition` (Pattern B), per §3c.

### Adding a new component

1. Put it under `components/<domain>/` — pick the existing domain folder that matches what it's
   about (chat, profile, events, etc.), not a generic `components/common/`. If it's a truly
   generic UI primitive (like a new Radix-based control), it goes in `components/ui/` following
   the existing `button.tsx`/`dialog.tsx` pattern.
2. Name the file `PascalCase.tsx` matching the exported component name (e.g. `RsvpButton.tsx`
   exports `RsvpButton`).
3. Default to a Server Component (no `"use client"` directive) unless the component needs
   hooks, event handlers, browser APIs, or realtime subscriptions — then add `"use client"` as
   the very first line of the file.
4. If it needs server data, prefer receiving it as props from a parent Server Component, or use
   a TanStack Query hook from `lib/<domain>/hooks.ts` if it needs to fetch/refetch on its own.
5. If it needs to call a Server Action, import it directly from `lib/<domain>/actions.ts` and
   call it like a normal async function — see §3c for the two calling patterns and when to use
   each.
