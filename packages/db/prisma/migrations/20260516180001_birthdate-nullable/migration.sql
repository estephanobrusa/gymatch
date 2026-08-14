-- AlterTable: make birthDate nullable — it is null until onboarding completes
ALTER TABLE "users" ALTER COLUMN "birthDate" DROP NOT NULL;
