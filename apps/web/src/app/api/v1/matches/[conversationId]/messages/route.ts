import { NextRequest, NextResponse } from "next/server";
import { handleApiRequest, apiError, readJsonBody } from "@/lib/api/http";
import {
  getConversationMessages,
  sendMessageForUser,
  EmptyMessageError,
  ConversationAccessError,
  ConversationBlockedError,
} from "@/lib/chat/service";

export const runtime = "nodejs";

/**
 * GET /api/v1/matches/[conversationId]/messages?cursor=<iso>
 *
 * Cursor-paginated messages for a conversation (oldest first).
 * Only accessible to conversation participants.
 *
 * Query params:
 *   - cursor?: ISO string of the oldest message already loaded
 *
 * Success: 200 { messages: ChatMessage[], nextCursor: string | null }
 * Errors: 403 not a participant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  return handleApiRequest(request, async (ctx) => {
    const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;
    const page = await getConversationMessages(ctx.dbUser.id, conversationId, cursor);
    if (!page) return apiError(403, "Forbidden");
    return NextResponse.json(page);
  });
}

/**
 * POST /api/v1/matches/[conversationId]/messages
 *
 * Sends a message in the given conversation.
 *
 * Body: { body: string }
 * Success: 200 ChatMessage
 * Errors: 400 empty body, 403 not a participant / blocked
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  return handleApiRequest(request, async (ctx) => {
    const body = await readJsonBody<{ body?: unknown }>(request);
    if (!body || typeof body.body !== "string") {
      return apiError(400, "Invalid body: body is required");
    }

    try {
      const { message } = await sendMessageForUser(ctx.dbUser.id, conversationId, body.body);
      return NextResponse.json(message);
    } catch (err) {
      if (err instanceof EmptyMessageError) return apiError(400, err.message);
      if (err instanceof ConversationAccessError) return apiError(403, err.message);
      if (err instanceof ConversationBlockedError) return apiError(403, err.message);
      throw err;
    }
  });
}