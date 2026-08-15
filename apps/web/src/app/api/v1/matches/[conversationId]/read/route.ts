import { NextRequest, NextResponse } from "next/server";
import { handleApiRequest } from "@/lib/api/http";
import { markConversationReadForUser } from "@/lib/chat/service";

export const runtime = "nodejs";

/**
 * POST /api/v1/matches/[conversationId]/read
 *
 * Marks all unread messages in the conversation as read.
 * No-op (silently succeeds) when the user is not a participant — matches the
 * web server action behavior.
 *
 * Body: none
 * Success: 200 { success: true }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  return handleApiRequest(request, async (ctx) => {
    await markConversationReadForUser(ctx.dbUser.id, conversationId);
    return NextResponse.json({ success: true });
  });
}