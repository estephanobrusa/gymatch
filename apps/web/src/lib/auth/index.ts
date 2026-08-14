import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User as PrismaUser } from "@gymatch/db";
import { createClient } from "@/lib/supabase/server";
import { prismaAdmin } from "@/lib/auth/admin";

/**
 * Returns the currently authenticated Supabase user, or null.
 * Uses getUser() — NOT getSession() — to re-validate the token server-side.
 */
export async function getUser(): Promise<SupabaseUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Upserts a Prisma User record from the Supabase auth user.
 * Called once at OAuth callback — NOT in middleware.
 *
 * Uses prismaAdmin (service-role, direct port-5432 connection) to bypass RLS —
 * necessary because the user row does not exist yet at this point.
 *
 * - New user: creates with supabaseId, email, name (falls back to "" if missing)
 * - Returning user: no duplicate, returns existing record
 */
export async function syncUser(supabaseUser: SupabaseUser): Promise<PrismaUser> {
  const supabaseId = supabaseUser.id;
  const email = supabaseUser.email ?? "";
  const name = (supabaseUser.user_metadata?.full_name as string | undefined) ?? "";

  return prismaAdmin.user.upsert({
    where: { supabaseId },
    update: {},
    create: {
      supabaseId,
      email,
      name,
      // birthDate is null until onboarding completes (schema allows nullable)
    },
  });
}
