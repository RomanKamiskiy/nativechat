/**
 * Telegram Bot webhook → same RAG / Gemini core as the web widget.
 */

import { PrismaClient } from '@prisma/client';
import { generateGeminiFallbackReply, hasGeminiKey } from '../rag/gemini';
import { getOrCreateAiBot } from '../agents/botUser';

const UI_PRICING_CARD_TAG = '[UI:PRICING_CARD]';

export type TelegramUpdate = {
  message?: {
    message_id?: number;
    text?: string;
    chat?: { id?: number | string };
    from?: { id?: number | string; first_name?: string; username?: string };
  };
};

export async function handleTelegramUpdate(
  prisma: PrismaClient,
  update: TelegramUpdate
): Promise<{ ok: true; skipped?: string }> {
  const message = update.message;
  if (!message?.text || message.chat?.id == null) {
    return { ok: true, skipped: 'no_text_message' };
  }

  const tgToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!tgToken) {
    console.error('TELEGRAM_BOT_TOKEN is not set');
    return { ok: true, skipped: 'missing_token' };
  }

  if (!hasGeminiKey()) {
    console.error('GEMINI_API_KEY is not set — cannot answer Telegram message');
    return { ok: true, skipped: 'missing_gemini' };
  }

  const chatId = String(message.chat.id);
  const text = message.text.trim();
  if (!text) return { ok: true, skipped: 'empty_text' };

  const project =
    (await prisma.project.findFirst({ orderBy: { updatedAt: 'desc' } })) ||
    null;
  if (!project) return { ok: true, skipped: 'no_project' };

  const externalId = `tg:${chatId}`;
  const displayName =
    message.from?.username
      ? `TG @${message.from.username}`
      : message.from?.first_name
        ? `TG ${message.from.first_name}`
        : `TG-${chatId}`;

  let user = await prisma.user.findUnique({
    where: {
      projectId_externalId: { projectId: project.id, externalId },
    },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        projectId: project.id,
        externalId,
        name: displayName,
        role: 'user',
      },
    });
  }

  // Persist into the project's most recent conversation (MVP inbox visibility)
  let conversation = await prisma.conversation.findFirst({
    where: { projectId: project.id },
    orderBy: { updatedAt: 'desc' },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { projectId: project.id },
    });
  }

  await prisma.message.create({
    data: {
      content: text,
      senderId: user.id,
      conversationId: conversation.id,
      type: 'text',
      metadata: { channel: 'telegram', chatId },
    },
  });

  const reply = await generateGeminiFallbackReply(prisma, project.id, text);
  let aiText = reply.text;
  let replyMarkup: { inline_keyboard: Array<Array<{ text: string; url: string }>> } | undefined;

  if (aiText.includes(UI_PRICING_CARD_TAG)) {
    aiText = aiText.replace(/\[UI:PRICING_CARD\]/g, '').trim();
    const paymentUrl = process.env.TELEGRAM_PAYMENT_URL?.trim();
    const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim()?.replace(/^@/, '');
    const payUrl =
      paymentUrl ||
      (botUsername ? `https://t.me/${botUsername}` : 'https://t.me/');
    replyMarkup = {
      inline_keyboard: [[{ text: 'Оплатить Pro ($99)', url: payUrl }]],
    };
  }

  const bot = await getOrCreateAiBot(prisma, project.id);
  await prisma.message.create({
    data: {
      content: aiText,
      senderId: bot.id,
      conversationId: conversation.id,
      type: 'text',
      metadata: {
        channel: 'telegram',
        chatId,
        source: reply.source,
        model: reply.model,
        ...(reply.similarity != null ? { similarity: reply.similarity } : {}),
        ...(replyMarkup ? { telegramInlineKeyboard: true } : {}),
      },
    },
  });

  const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: aiText,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });

  if (!tgRes.ok) {
    const errBody = await tgRes.text().catch(() => '');
    console.error('Telegram sendMessage failed:', tgRes.status, errBody.slice(0, 300));
  }

  return { ok: true };
}
