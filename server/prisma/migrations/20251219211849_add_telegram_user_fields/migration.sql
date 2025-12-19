-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "languageCode" TEXT,
ADD COLUMN     "photoUrl" TEXT;
