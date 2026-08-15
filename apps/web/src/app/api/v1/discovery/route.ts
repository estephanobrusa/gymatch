import { NextRequest, NextResponse } from "next/server";
import { handleApiRequest } from "@/lib/api/http";
import { getDiscoveryFeed } from "@/lib/swipe/queries";

export const runtime = "nodejs";

/**
 * GET /api/v1/discovery?cursor=<lastId>
 *
 * Cursor-paginated discovery feed for the current user.
 *
 * Query params:
 *   - cursor?: keyset cursor (last card id from the previous page)
 *
 * Success: 200 { cards: DiscoveryCard[], nextCursor: string | null }
 */
export async function GET(request: NextRequest) {
  return handleApiRequest(request, async (ctx) => {
    const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;
    const feed = await getDiscoveryFeed(ctx.dbUser.id, cursor);
    return NextResponse.json(feed);
  });
}