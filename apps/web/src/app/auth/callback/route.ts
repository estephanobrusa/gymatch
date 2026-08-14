import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import { getOnboardingStatus } from "@/lib/auth/onboarding";
import { isWaitlistActive } from "@/lib/waitlist/queries";

/**
 * OAuth callback route handler.
 *
 * Flow:
 *   1. Read `code` query param — missing → redirect /login?error=missing_code
 *   2. Exchange code for session — failure → redirect /login?error=auth_failed
 *   3. Waitlist gate — when active, brand-new users are captured (not admitted)
 *   4. syncUser() — upsert Prisma user row (idempotent)
 *   5. Ban check → /banned wins over onboarding
 *   6. getOnboardingStatus() → redirect to first incomplete step or /
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Waitlist gate — when active, capture brand-new signups instead of
  // admitting them. Existing users (already in the DB) keep their access.
  const waitlistActive = await isWaitlistActive();
  if (waitlistActive) {
    const existing = await prismaAdmin.user.findUnique({
      where: { supabaseId: supabaseUser.id },
      select: { id: true },
    });
    if (!existing) {
      const email = supabaseUser.email ?? "";
      const name =
        (supabaseUser.user_metadata?.full_name as string | undefined) ?? null;
      if (email) {
        await prismaAdmin.waitlistEntry.upsert({
          where: { email },
          update: {},
          create: { email, name },
        });
      }
      return NextResponse.redirect(`${origin}/waitlist`);
    }
  }

  // Upsert the Prisma user — uses the regular prisma client via syncUser
  await syncUser(supabaseUser);

  // Ban check wins over onboarding: a banned user must land on /banned
  // (where they can appeal), never on an onboarding step.
  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: supabaseUser.id },
    select: { bannedAt: true },
  });
  if (dbUser?.bannedAt) {
    return NextResponse.redirect(`${origin}/banned`);
  }

  // Determine next step in onboarding
  const nextStep = await getOnboardingStatus(supabaseUser.id);

  return NextResponse.redirect(`${origin}${nextStep ?? "/"}`);
}
