import { PrismaClient } from "@prisma/client";

/**
 * Service-role Prisma client that connects via a direct port-5432 connection.
 *
 * ADMIN_DATABASE_URL must use the Supabase service role key as the password so
 * that Postgres skips Row Level Security entirely.  This client MUST only be
 * used server-side (Route Handlers, Server Actions, Server Components).
 *
 * There is no RLS-respecting Prisma client anywhere in this app — this admin
 * client bypasses Postgres Row Level Security entirely, and it is the one
 * used by almost every server-side read/write. All authorization must be
 * enforced manually in service/action code; it is never assumed from the
 * database layer.
 *
 * Never import this in client components or expose it through public APIs.
 */

const globalForPrismaAdmin = global as unknown as { __prismaAdmin: PrismaClient };

export const prismaAdmin: PrismaClient =
  globalForPrismaAdmin.__prismaAdmin ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.ADMIN_DATABASE_URL!,
      },
    },
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrismaAdmin.__prismaAdmin = prismaAdmin;
}
