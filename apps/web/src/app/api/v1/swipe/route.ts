import { NextRequest, NextResponse } from "next/server";
import { handleApiRequest, apiError, readJsonBody } from "@/lib/api/http";
import { recordSwipeForUser } from "@/lib/swipe/service";
import { FeatureFlagError } from "@gymatch/core";

export const runtime = "nodejs";

/**
 * POST /api/v1/swipe
 *
 * Records a swipe from the current user to `toId` and detects a mutual match.
 * The `SwipeResult` is returned as-is: { matched, matchId?, matchedUser? }.
 *
 * Body: { toId: string, direction: "LIKE" | "PASS" }
 * Success: 200 SwipeResult
 * Errors: 400 invalid body, 403 feature-flagged direction
 */
export async function POST(request: NextRequest) {
  return handleApiRequest(request, async (ctx) => {
    const body = await readJsonBody<{ toId?: unknown; direction?: unknown }>(request);
    if (!body || typeof body.toId !== "string" || body.toId.trim() === "") {
      return apiError(400, "Invalid body: toId is required");
    }
    if (body.direction !== "LIKE" && body.direction !== "PASS") {
      return apiError(400, "Invalid body: direction must be LIKE or PASS");
    }

    try {
      const result = await recordSwipeForUser(ctx.dbUser.id, body.toId, body.direction);
      return NextResponse.json(result);
    } catch (err) {
      if (err instanceof FeatureFlagError) return apiError(403, err.message);
      throw err;
    }
  });
}