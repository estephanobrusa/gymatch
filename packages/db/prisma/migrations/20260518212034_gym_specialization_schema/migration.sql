-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'FULL_BODY', 'CARDIO', 'WOD', 'REST');

-- CreateEnum
CREATE TYPE "RoutineTemplate" AS ENUM ('PUSH_PULL_LEGS', 'BRO_SPLIT', 'FULL_BODY_3', 'UPPER_LOWER', 'ARNOLD_SPLIT', 'CUSTOM');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "weeklyFrequency" INTEGER;

-- CreateTable
CREATE TABLE "weekly_routines" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mon" "MuscleGroup",
    "tue" "MuscleGroup",
    "wed" "MuscleGroup",
    "thu" "MuscleGroup",
    "fri" "MuscleGroup",
    "sat" "MuscleGroup",
    "sun" "MuscleGroup",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_routines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weekly_routines_userId_key" ON "weekly_routines"("userId");

-- AddForeignKey
ALTER TABLE "weekly_routines" ADD CONSTRAINT "weekly_routines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
