import { NextRequest, NextResponse } from "next/server";
import { handleApiRequest, apiError } from "@/lib/api/http";
import { toggleEventRsvp } from "@/lib/events/service";

export const runtime = "nodejs";

/**
 * POST /api/v1/events/[eventId]/rsvp
 *
 * Toggles the current user's RSVP on the event (toggle — no body needed).
 *
 * Body: none
 * Success: 200 { success: true, attending: boolean }
 * Errors: 404 event not found
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  return handleApiRequest(request, async (ctx) => {
    const result = await toggleEventRsvp(eventId, ctx.dbUser.id);
    if ("error" in result) return apiError(404, result.error);
    return NextResponse.json(result);
  });
}