import { createClient } from "@supabase/supabase-js";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { prismaAdmin } from "@/lib/auth/admin";

/**
 * Authenticated context for REST API handlers.
 * `dbUser` carries the internal Prisma id — every business function takes the
 * DB id, never the Supabase auth id.
 */
export type ApiUserContext = {
  authUser: SupabaseUser;
  dbUser: { id: string };
};

/**
 * Validates a Bearer JWT from the `Authorization` header against Supabase
 * Auth and resolves the matching Prisma user.
 *
 * - Uses `getUser(token)` — NOT `getSession` — so the token is re-validated
 *   on every request (same criterion as the web app).
 * - Uses a cookie-less Supabase client (@supabase/supabase-js `createClient`);
 *   mobile clients cannot send cookies, only the Authorization header.
 *
 * Returns null when the header is missing/malformed, the token is invalid or
 * expired, or the Prisma user has not been synced yet (call /api/v1/auth/sync
 * right after login).
 */
export async function requireApiUser(
  request: Request
): Promise<ApiUserContext | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });
  if (!dbUser) return null;

  return { authUser: user, dbUser };
}