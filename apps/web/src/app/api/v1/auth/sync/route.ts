import { NextRequest, NextResponse } from "next/server";
import { handleApiRequest } from "@/lib/api/http";
import { syncUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/v1/auth/sync
 *
 * Syncs the Supabase auth user (from the Bearer token) into Prisma.
 * This is the first call the mobile app makes after login — it guarantees a
 * Prisma user row exists before any other endpoint is used.
 *
 * Body: none (identity comes from the token).
 * Success: 200 { user: { id, email, name, username } }
 */
export async function POST(request: NextRequest) {
  return handleApiRequest(request, async (ctx) => {
    const user = await syncUser(ctx.authUser);
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
      },
    });
  });
}