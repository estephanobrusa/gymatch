-- Migration: report_block_schema
-- Adds ReportReason enum, renames Report columns (fromId→reporterId, toId→targetId),
-- casts reason column from TEXT to enum, and adds unique constraint.
--
-- NOTE: This migration uses a multi-step approach to safely change the column type.
-- If existing Report rows contain reason strings not matching the enum values,
-- the cast in step 3 will FAIL FAST — acceptable at MVP stage (no production data).

-- Step 1: Create the ReportReason enum
CREATE TYPE "ReportReason" AS ENUM (
  'FAKE_PROFILE',
  'HARASSMENT',
  'SEXUAL_CONTENT',
  'SPAM',
  'UNDERAGE',
  'OFFENSIVE_BEHAVIOR'
);

-- Step 2: Add a temporary column for the new enum type
ALTER TABLE "reports" ADD COLUMN "reason_new" "ReportReason";

-- Step 3: Cast existing rows from text to enum.
-- Fails fast if any existing value doesn't match a valid enum member.
UPDATE "reports" SET "reason_new" = "reason"::"ReportReason";

-- Step 4: Drop old text column, rename new enum column to 'reason'
ALTER TABLE "reports" DROP COLUMN "reason";
ALTER TABLE "reports" RENAME COLUMN "reason_new" TO "reason";

-- Step 5: Set NOT NULL on reason column (was nullable during migration)
ALTER TABLE "reports" ALTER COLUMN "reason" SET NOT NULL;

-- Step 6: Rename fromId → reporterId
ALTER TABLE "reports" RENAME COLUMN "fromId" TO "reporterId";

-- Step 7: Rename toId → targetId
ALTER TABLE "reports" RENAME COLUMN "toId" TO "targetId";

-- Step 8: Drop old FK constraints (named by Prisma conventions)
ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_fromId_fkey";
ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_toId_fkey";

-- Step 9: Re-add FK constraints with new column names
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reports" ADD CONSTRAINT "reports_targetId_fkey"
  FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 10: Add unique constraint on (reporterId, targetId)
CREATE UNIQUE INDEX "reports_reporterId_targetId_key" ON "reports"("reporterId", "targetId");
