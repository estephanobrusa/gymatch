-- AlterTable
ALTER TABLE "users" ADD COLUMN     "hideProfile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "incognitoMode" BOOLEAN NOT NULL DEFAULT false;
