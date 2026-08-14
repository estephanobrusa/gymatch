import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getOnboardingStatus } from "@/lib/auth/onboarding";
import { prismaAdmin } from "@/lib/auth/admin";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { PushPermissionBanner } from "@/components/push/PushPermissionBanner";

/**
 * Protected layout gate — Server Component.
 *
 * Three-layer auth check:
 *   1. Supabase session (via getUser) — no session → /login
 *   2. Ban status (via Prisma) — bannedAt set → /banned
 *   3. Onboarding status (via Prisma) — incomplete → first missing step
 *
 * Note: the middleware already guards session at the Edge; this provides the
 * deeper ban + onboarding checks that require Prisma (Node.js runtime only).
 */
export default async function ProtectedLayout({
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

  if (dbUser?.bannedAt) {
    redirect("/banned");
  }

  const nextStep = await getOnboardingStatus(user.id);

  if (nextStep) {
    redirect(nextStep);
  }

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <TopBar />
      <div className="flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
      <BottomNav />
      <PushPermissionBanner />
    </div>
  );
}
