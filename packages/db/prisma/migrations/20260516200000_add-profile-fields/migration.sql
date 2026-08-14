-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "FitnessGoal" AS ENUM ('MUSCLE_GAIN', 'FAT_LOSS', 'STRENGTH', 'ENDURANCE', 'FLEXIBILITY', 'GENERAL_FITNESS', 'SPORTS_PERFORMANCE');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "Schedule" AS ENUM ('EARLY_MORNING', 'MORNING', 'MIDDAY', 'AFTERNOON', 'EVENING', 'NIGHT');

-- CreateEnum
CREATE TYPE "Discipline" AS ENUM ('WEIGHTLIFTING', 'CROSSFIT', 'YOGA', 'PILATES', 'RUNNING', 'CYCLING', 'SWIMMING', 'BOXING', 'MARTIAL_ARTS', 'CALISTHENICS', 'HIIT', 'FUNCTIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "LookingFor" AS ENUM ('ACCOUNTABILITY_PARTNER', 'SPOTTER', 'RUNNING_BUDDY', 'TRAINING_PARTNER', 'MENTOR', 'MENTEE', 'WORKOUT_GROUP');

-- AlterTable
ALTER TABLE "gyms" ADD COLUMN     "googlePlaceId" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "city" TEXT,
ADD COLUMN     "disciplines" "Discipline"[],
ADD COLUMN     "experienceLevel" "ExperienceLevel",
ADD COLUMN     "fitnessGoals" "FitnessGoal"[],
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "lookingFor" "LookingFor"[],
ADD COLUMN     "maxDistance" INTEGER,
ADD COLUMN     "schedule" "Schedule"[],
ADD COLUMN     "weight" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "gyms_googlePlaceId_key" ON "gyms"("googlePlaceId");
