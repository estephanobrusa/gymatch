import { NextRequest, NextResponse } from "next/server";
import { handleApiRequest, apiError, readJsonBody } from "@/lib/api/http";
import { getRoutine, saveRoutine } from "@/lib/routine/service";
import type { RoutineInput } from "@gymatch/core";

export const runtime = "nodejs";

/**
 * GET /api/v1/routine
 *
 * Returns the current user's weekly routine, or null if none exists.
 *
 * Success: 200 { routine: WeeklyRoutine | null }
 */
export async function GET(request: NextRequest) {
  return handleApiRequest(request, async (ctx) => {
    const routine = await getRoutine(ctx.dbUser.id);
    return NextResponse.json({ routine });
  });
}

/**
 * POST /api/v1/routine
 *
 * Replaces the current user's weekly routine (all 7 days).
 *
 * Body: RoutineInput (Record<DayKey, MuscleGroup | null>)
 * Success: 200 { success: true }
 */
export async function POST(request: NextRequest) {
  return handleApiRequest(request, async (ctx) => {
    const body = await readJsonBody<RoutineInput>(request);
    if (!body) return apiError(400, "Invalid JSON body");

    await saveRoutine(ctx.dbUser.id, body);
    return NextResponse.json({ success: true });
  });
}