import { NextRequest, NextResponse } from "next/server";
import { handleApiRequest, apiError } from "@/lib/api/http";
import { getProfileUser } from "@/lib/profile/queries";
import { getOnboardingStatus } from "@/lib/auth/onboarding";

export const runtime = "nodejs";

/**
 * GET /api/v1/me
 *
 * Returns the current user's profile plus onboarding status.
 *
 * Success: 200 { user: ProfileUser, onboardingStatus: OnboardingStatus }
 */
export async function GET(request: NextRequest) {
  return handleApiRequest(request, async (ctx) => {
    const [user, onboardingStatus] = await Promise.all([
      getProfileUser(ctx.authUser.id),
      getOnboardingStatus(ctx.authUser.id),
    ]);

    if (!user) return apiError(404, "User not found");

    return NextResponse.json({ user, onboardingStatus });
  });
}