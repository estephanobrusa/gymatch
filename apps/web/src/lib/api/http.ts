import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser, type ApiUserContext } from "./auth";

/**
 * Error response convention: JSON `{ error: string }`.
 * Success responses are raw data (200) — see each route.
 */
export function apiError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Reads and parses the JSON body. Returns null when the body is missing or
 * malformed (callers map that to a 400).
 */
export async function readJsonBody<T = unknown>(
  request: NextRequest
): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Wraps an authenticated API handler: validates the Bearer token via
 * requireApiUser and normalizes unexpected errors to a generic 500.
 *
 * Handlers map their own domain errors; anything that escapes becomes
 * `{ error: "Internal Server Error" }` — the stack stays server-side only.
 */
export async function handleApiRequest(
  request: NextRequest,
  run: (ctx: ApiUserContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const ctx = await requireApiUser(request);
    if (!ctx) return apiError(401, "Unauthorized");
    return await run(ctx);
  } catch (err) {
    console.error("[api/v1]", err);
    return apiError(500, "Internal Server Error");
  }
}