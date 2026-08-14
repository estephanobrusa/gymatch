import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";

/**
 * Server-side guard. Resolves the DB user and verifies ADMIN role.
 * Redirects to /login if unauthenticated, to / if not ADMIN.
 * Returns the full DB user on success.
 */
export async function requireAdmin() {
  const supabaseUser = await getUser();
  if (!supabaseUser) redirect("/login");

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: supabaseUser.id },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!dbUser || dbUser.role !== "ADMIN") redirect("/");

  return dbUser;
}
