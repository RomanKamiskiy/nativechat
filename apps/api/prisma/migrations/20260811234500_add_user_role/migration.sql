-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';

-- Backfill known system users
UPDATE "User" SET "role" = 'bot' WHERE "externalId" = '__nativechat_ai_bot__';
UPDATE "User" SET "role" = 'admin' WHERE "name" = 'Admin Support';
