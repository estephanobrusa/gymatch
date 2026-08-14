import { PrismaClient } from '@prisma/client'

// Extend the global object to hold a PrismaClient singleton.
// This prevents exhausting DB connections during Next.js hot reload in dev mode.
const globalForPrisma = global as unknown as { __prisma: PrismaClient }

export const prisma: PrismaClient =
  globalForPrisma.__prisma ?? new PrismaClient({ log: ['error'] })

// In development, preserve the instance across hot reloads.
// In production, module caching is sufficient — no need to touch global.
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma
}
