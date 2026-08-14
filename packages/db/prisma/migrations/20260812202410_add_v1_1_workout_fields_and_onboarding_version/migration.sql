-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('NORMAL', 'INTENSE', 'PR_DAY', 'RECOVERY');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboardingVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "todayMuscleGroup" "MuscleGroup",
ADD COLUMN     "todaySessionType" "SessionType";
