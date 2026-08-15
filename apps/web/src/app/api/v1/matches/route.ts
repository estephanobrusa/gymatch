import { NextRequest, NextResponse } from "next/server";
import { handleApiRequest } from "@/lib/api/http";
import { getMatchesForUser } from "@/lib/chat/service";

export const runtime = "nodejs";

/**
 * GET /api/v1/matches
 *
 * Returns all matches for the current user.
 *
 * Success: 200 MatchPreview[]
 */
export async function GET(request: NextRequest) {
  return handleApiRequest(request, async (ctx) => {
    const matches = await getMatchesForUser(ctx.dbUser.id);
    return NextResponse.json(matches);
  });
}