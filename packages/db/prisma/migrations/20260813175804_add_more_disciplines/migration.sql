-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Discipline" ADD VALUE 'BASKETBALL';
ALTER TYPE "Discipline" ADD VALUE 'BJJ';
ALTER TYPE "Discipline" ADD VALUE 'CLIMBING';
ALTER TYPE "Discipline" ADD VALUE 'DANCE';
ALTER TYPE "Discipline" ADD VALUE 'JUDO';
ALTER TYPE "Discipline" ADD VALUE 'KARATE';
ALTER TYPE "Discipline" ADD VALUE 'KICKBOXING';
ALTER TYPE "Discipline" ADD VALUE 'MMA';
ALTER TYPE "Discipline" ADD VALUE 'MUAY_THAI';
ALTER TYPE "Discipline" ADD VALUE 'PADEL';
ALTER TYPE "Discipline" ADD VALUE 'ROWING';
ALTER TYPE "Discipline" ADD VALUE 'SOCCER';
ALTER TYPE "Discipline" ADD VALUE 'SPINNING';
ALTER TYPE "Discipline" ADD VALUE 'TENNIS';
ALTER TYPE "Discipline" ADD VALUE 'ZUMBA';
