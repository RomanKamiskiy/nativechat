-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "setupTokenBudget" INTEGER NOT NULL DEFAULT 8000,
ADD COLUMN     "setupTokensUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "setupCompletedAt" TIMESTAMP(3),
ADD COLUMN     "productUrl" TEXT,
ADD COLUMN     "productName" TEXT,
ADD COLUMN     "themeTokens" JSONB,
ADD COLUMN     "welcomeMessage" TEXT;
