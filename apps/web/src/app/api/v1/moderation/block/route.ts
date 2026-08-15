import { NextRequest, NextResponse } from "next/server";
import { handleApiRequest, apiError, readJsonBody } from "@/lib/api/http";
import { blockUser } from "@/lib/moderation/service";

export const runtime = "nodejs";

/**
 * POST /api/v1/moderation/block
 *
 * Blocks a target user.
 *
 * Body: { userId: string }
 * Success: 200 { success: true }
 * Errors: 400 invalid body, 409 already blocked
 */
export async function POST(request: NextRequest) {
  return handleApiRequest(request, async (ctx) => {
    const body = await readJsonBody<{ userId?: unknown }>(request);
    if (!body || typeof body.userId !== "string" || body.userId.trim() === "") {
      return apiError(400, "Invalid body: userId is required");
    }

    const result = await blockUser(ctx.dbUser.id, body.userId);
    if ("error" in result) {
      if (result.error === "already_blocked") return apiError(409, "Already blocked");
      return apiError(500, "Failed to block user");
    }

    return NextResponse.json({ success: true });
  });
}