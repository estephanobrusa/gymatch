import { NextRequest, NextResponse } from "next/server";
import { handleApiRequest, apiError } from "@/lib/api/http";
import { unmatchForUser } from "@/lib/chat/service";
import { prismaAdmin } from "@/lib/auth/admin";

export const runtime = "nodejs";

/**
 * POST /api/v1/matches/[conversationId]/unmatch
 *
 * Removes the match behind the given conversation (cascade-deletes messages).
 * The route is addressed by conversationId because that is what the mobile
 * chat screen holds; the underlying Match row is resolved first.
 *
 * Body: none
 * Success: 200 { success: true }
 * Errors: 404 conversation/match not found, 403 not a participant
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  return handleApiRequest(request, async (ctx) => {
    const conversation = await prismaAdmin.conversation.findUnique({
      where: { id: conversationId },
      select: { matchId: true },
    });
    if (!conversation) return apiError(404, "Conversation not found");

    const result = await unmatchForUser(ctx.dbUser.id, conversation.matchId);
    if ("error" in result) {
      if (result.error === "not_found") return apiError(404, "Match not found");
      if (result.error === "unauthorized") return apiError(403, "Forbidden");
      return apiError(400, "Failed to unmatch");
    }

    return NextResponse.json({ success: true });
  });
}