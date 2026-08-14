-- AlterTable: add supabaseId (required, unique) and username (optional, unique) to users
ALTER TABLE "users" ADD COLUMN "supabaseId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Remove the temporary default now that column exists
ALTER TABLE "users" ALTER COLUMN "supabaseId" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "users_supabaseId_key" ON "users"("supabaseId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
