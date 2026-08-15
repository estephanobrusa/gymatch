import { NextRequest, NextResponse } from "next/server";
import { handleApiRequest, apiError, readJsonBody } from "@/lib/api/http";
import { reportUser } from "@/lib/moderation/service";
import type { ReportReason } from "@/lib/moderation/service";

export const runtime = "nodejs";

/**
 * POST /api/v1/moderation/report
 *
 * Reports a target user with a reason. Automatically unmatches the reporter
 * and the target (evidence of the last 20 messages is captured first).
 *
 * Body: { userId: string, reason: ReportReason }
 * Success: 200 { success: true }
 * Errors: 400 invalid body / invalid reason, 409 already reported
 */
export async function POST(request: NextRequest) {
  return handleApiRequest(request, async (ctx) => {
    const body = await readJsonBody<{ userId?: unknown; reason?: unknown }>(request);
    if (
      !body ||
      typeof body.userId !== "string" ||
      body.userId.trim() === "" ||
      typeof body.reason !== "string"
    ) {
      return apiError(400, "Invalid body: userId and reason are required");
    }

    const result = await reportUser(ctx.dbUser.id, body.userId, body.reason as ReportReason);
    if ("error" in result) {
      if (result.error === "invalid_reason") return apiError(400, "Invalid reason");
      if (result.error === "already_reported") return apiError(409, "Already reported");
      return apiError(500, "Failed to report user");
    }

    return NextResponse.json({ success: true });
  });
}