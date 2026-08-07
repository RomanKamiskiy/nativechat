-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "agentProvider" TEXT NOT NULL DEFAULT 'free_mini',
ADD COLUMN     "mcpServerUrl" TEXT,
ADD COLUMN     "mcpToolName" TEXT NOT NULL DEFAULT 'chat',
ADD COLUMN     "mcpAuthToken" TEXT;
