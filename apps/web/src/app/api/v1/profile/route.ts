import { NextRequest, NextResponse } from "next/server";
import { handleApiRequest, apiError, readJsonBody } from "@/lib/api/http";
import { updateProfile } from "@/lib/profile/service";
import type { ProfileUpdateInput } from "@/lib/profile/service";
import { getProfileUser } from "@/lib/profile/queries";

export const runtime = "nodejs";

/**
 * POST /api/v1/profile
 *
 * Partially updates the current user's profile (same input shape as
 * updateProfileAction: bio, disciplines, fitnessGoals, experienceLevel,
 * weeklyFrequency, schedule, minAge, maxAge).
 *
 * Body: ProfileUpdateInput (partial)
 * Success: 200 { user: ProfileUser } (the updated profile)
 * Errors: 400 invalid body / age range validation
 */
export async function POST(request: NextRequest) {
  return handleApiRequest(request, async (ctx) => {
    const body = await readJsonBody<ProfileUpdateInput>(request);
    if (!body) return apiError(400, "Invalid JSON body");

    const result = await updateProfile(ctx.dbUser.id, body);
    if ("error" in result) return apiError(400, result.error);

    const user = await getProfileUser(ctx.authUser.id);
    if (!user) return apiError(404, "User not found");

    return NextResponse.json({ user });
  });
}