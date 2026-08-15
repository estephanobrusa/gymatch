import type {
  ChatMessage,
  ConversationPage,
  DiscoveryCard,
  MatchPreview,
  ProfileUser,
  SwipeDirection,
  SwipeResult,
} from "@gymatch/core";

import { getApiBaseUrl } from "./base-url";

/**
 * Thin typed fetch client for the apps/web REST API (`/api/v1/*`).
 *
 * Every helper takes an explicit `token` (Supabase access token) and attaches
 * it as `Authorization: Bearer <token>`. Errors are thrown as `ApiError`
 * carrying the HTTP status and the backend's `{ error: string }` message.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly error: string;

  constructor(status: number, error: string) {
    super(error);
    this.name = "ApiError";
    this.status = status;
    this.error = error;
  }
}

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers,
    body: body === undefined ? null : JSON.stringify(body),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return data as T;
}

// ──────────────────────────────────────────────────────────────────────────
// Domain helpers
// ──────────────────────────────────────────────────────────────────────────

export type OnboardingStatus =
  | "/onboarding/username"
  | "/onboarding/birthdate"
  | "/onboarding/photo"
  | "/onboarding/fitness"
  | "/onboarding/routine"
  | null;

export interface SyncUser {
  id: string;
  email: string;
  name: string;
  username: string | null;
}

export interface MeResponse {
  user: ProfileUser;
  onboardingStatus: OnboardingStatus;
}

export interface DiscoveryPage {
  cards: DiscoveryCard[];
  nextCursor: string | null;
}

/** POST /api/v1/auth/sync — guarantees the Prisma user exists (mirrors web syncUser). */
export function authSync(token: string): Promise<SyncUser> {
  return apiFetch<{ user: SyncUser }>("/api/v1/auth/sync", {
    method: "POST",
    token,
  }).then((res) => res.user);
}

/** GET /api/v1/me — current user profile + onboarding status. */
export function getMe(token: string): Promise<MeResponse> {
  return apiFetch<MeResponse>("/api/v1/me", { token });
}

/** GET /api/v1/discovery?cursor= — cursor-paginated discovery feed. */
export function getDiscoveryFeed(
  token: string,
  cursor?: string
): Promise<DiscoveryPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return apiFetch<DiscoveryPage>(`/api/v1/discovery${query}`, { token });
}

/** POST /api/v1/swipe — records a swipe and detects a mutual match. */
export function recordSwipe(
  token: string,
  toId: string,
  direction: SwipeDirection
): Promise<SwipeResult> {
  return apiFetch<SwipeResult>("/api/v1/swipe", {
    method: "POST",
    token,
    body: { toId, direction },
  });
}

/** GET /api/v1/matches — all matches for the current user. */
export function getMatches(token: string): Promise<MatchPreview[]> {
  return apiFetch<MatchPreview[]>("/api/v1/matches", { token });
}

/** GET /api/v1/matches/[conversationId]/messages?cursor= — paginated messages. */
export function getMessages(
  token: string,
  conversationId: string,
  cursor?: string
): Promise<ConversationPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return apiFetch<ConversationPage>(
    `/api/v1/matches/${encodeURIComponent(conversationId)}/messages${query}`,
    { token }
  );
}

/** POST /api/v1/matches/[conversationId]/messages — sends a message. */
export function sendMessage(
  token: string,
  conversationId: string,
  body: string
): Promise<ChatMessage> {
  return apiFetch<ChatMessage>(
    `/api/v1/matches/${encodeURIComponent(conversationId)}/messages`,
    { method: "POST", token, body: { body } }
  );
}

/** POST /api/v1/matches/[conversationId]/read — marks the conversation read. */
export function markRead(
  token: string,
  conversationId: string
): Promise<{ success: true }> {
  return apiFetch<{ success: true }>(
    `/api/v1/matches/${encodeURIComponent(conversationId)}/read`,
    { method: "POST", token }
  );
}

/** POST /api/v1/matches/[conversationId]/unmatch — removes the match. */
export function unmatch(
  token: string,
  conversationId: string
): Promise<{ success: true }> {
  return apiFetch<{ success: true }>(
    `/api/v1/matches/${encodeURIComponent(conversationId)}/unmatch`,
    { method: "POST", token }
  );
}