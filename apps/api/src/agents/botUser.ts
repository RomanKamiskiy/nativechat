import { PrismaClient } from '@prisma/client';

const AI_BOT_EXTERNAL_ID = '__nativechat_ai_bot__';

/** Ensure a per-project AI bot user exists for agent replies. */
export async function getOrCreateAiBot(prisma: PrismaClient, projectId: string) {
  const existing = await prisma.user.findUnique({
    where: {
      projectId_externalId: {
        projectId,
        externalId: AI_BOT_EXTERNAL_ID,
      },
    },
  });

  if (existing) return existing;

  return prisma.user.create({
    data: {
      projectId,
      externalId: AI_BOT_EXTERNAL_ID,
      name: 'AI Agent',
      avatarUrl: null,
    },
  });
}
