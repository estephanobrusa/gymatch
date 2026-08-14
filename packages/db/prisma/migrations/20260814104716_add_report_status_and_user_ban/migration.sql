-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'WARNED', 'BANNED', 'DISMISSED');

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "note" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedById" TEXT,
ADD COLUMN     "status" "ReportStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bannedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
