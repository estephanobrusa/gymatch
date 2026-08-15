import { NextRequest, NextResponse } from "next/server";
import { handleApiRequest } from "@/lib/api/http";
import { getFilteredEvents } from "@/lib/events/queries";
import type { Discipline, EventType } from "@prisma/client";

export const runtime = "nodejs";

/**
 * GET /api/v1/events?nearMe=true&types=A,B&disciplines=C,D&cursor=<id>&limit=20
 *
 * Upcoming events feed (soonest first), filtered by the current user.
 *
 * Query params:
 *   - nearMe?:      "true" restricts to the viewer's city / nearby gym
 *   - types?:       comma-separated EventType values
 *   - disciplines?: comma-separated Discipline values
 *   - cursor?:      keyset cursor (last event id from the previous page)
 *   - limit?:       page size (1..50, default 20)
 *
 * Success: 200 { events: EventWithRelations[], nextCursor: string | null }
 */
export async function GET(request: NextRequest) {
  return handleApiRequest(request, async (ctx) => {
    const sp = request.nextUrl.searchParams;
    const nearMe = sp.get("nearMe") === "true";
    const cursor = sp.get("cursor") ?? undefined;
    const types = (sp.get("types")?.split(",").filter(Boolean) ?? []) as EventType[];
    const disciplines = (sp
      .get("disciplines")
      ?.split(",")
      .filter(Boolean) ?? []) as Discipline[];
    const limitRaw = Number(sp.get("limit") ?? 20);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;

    const feed = await getFilteredEvents({
      userId: ctx.dbUser.id,
      nearMe,
      types,
      disciplines,
      limit,
      ...(cursor !== undefined ? { cursor } : {}),
    });
    return NextResponse.json(feed);
  });
}