import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getOnboardingStatus } from "@/lib/auth/onboarding";
import { prismaAdmin } from "@/lib/auth/admin";

/**
 * Onboarding layout gate — Server Component.
 *
 * Ensures:
 *   1. User is authenticated (no session → /login)
 *   2. Banned users are sent to /banned (appeal) — never to onboarding
 *   3. Onboarding is NOT complete (null status → / to avoid re-entering flow)
 *
 * Note: does NOT redirect to the current step — each page handles its own
 * step-skipping logic if needed. This gate only blocks fully-onboarded users.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: user.id },
    select: { bannedAt: true },
  });

  // Ban wins over onboarding — a banned user goes to /banned to appeal.
  if (dbUser?.bannedAt) {
    redirect("/banned");
  }

  const nextStep = await getOnboardingStatus(user.id);

  // Already completed onboarding — send them home
  if (nextStep === null) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
