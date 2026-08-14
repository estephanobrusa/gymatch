-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'CHALLENGE';
ALTER TYPE "EventType" ADD VALUE 'CLINIC';
ALTER TYPE "EventType" ADD VALUE 'FUNDRAISER';
ALTER TYPE "EventType" ADD VALUE 'MEETUP';
ALTER TYPE "EventType" ADD VALUE 'RETREAT';
ALTER TYPE "EventType" ADD VALUE 'TOURNAMENT';
