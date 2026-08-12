import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
import { Redis } from 'ioredis';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { generateAgentReply, toPublicAgentConfig } from './agents/service';
import { callAgentWebhook } from './agents/webhook';
import { getOrCreateAiBot } from './agents/botUser';
import { estimateAutoTuneTokens, toSetupBudgetSnapshot, DEFAULT_SETUP_TOKEN_BUDGET } from './setup/budget';
import { publicSetupState, runAutoTune } from './setup/autoTune';
import {
  findRelevantKnowledge,
  generateRagAnswer,
  hasGeminiKey,
  storeKnowledge,
} from './rag/gemini';

dotenv.config();

const prisma = new PrismaClient();
const fastify = Fastify({ logger: true });

fastify.register(cors, { origin: '*' });
fastify.register(jwt, { secret: process.env.JWT_SECRET || 'super-secret-nativechat-key' });

fastify.get('/health', async () => {
  return { status: 'ok', service: 'NativeChat API' };
});

// Эндпоинт генерации токена для юзера (Mock для MVP)
fastify.post('/api/auth/token', async (request, reply) => {
  const { projectId, userId, name } = request.body as any;

  if (!projectId || !userId || !name) {
    return reply.status(400).send({ error: 'Missing required fields' });
  }

  try {
    let project = await prisma.project.findFirst({ where: { name: projectId } });
    if (!project) {
      project = await prisma.project.create({
        data: {
          name: projectId,
          agentProvider: 'free_mini',
          setupTokenBudget: DEFAULT_SETUP_TOKEN_BUDGET,
        },
      });
    }

    let user = await prisma.user.findUnique({
      where: {
        projectId_externalId: {
          projectId: project.id,
          externalId: userId,
        },
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          projectId: project.id,
          externalId: userId,
          name,
        },
      });
    } else if (user.name !== name) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name },
      });
    }

    // Prefer the most recently active room so widget + dashboard stay in sync
    let conversation = await prisma.conversation.findFirst({
      where: { projectId: project.id },
      orderBy: { updatedAt: 'desc' },
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { projectId: project.id },
      });
    }

    // Ensure AI bot user exists for this project
    await getOrCreateAiBot(prisma, project.id);

    const token = fastify.jwt.sign({
      projectId: project.id,
      userId: user.id,
      name: user.name,
    });

    return {
      token,
      conversationId: conversation.id,
      userId: user.id,
      projectId: project.id,
      agent: toPublicAgentConfig(project),
      setup: publicSetupState(project),
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to issue token' });
  }
});

// Получение списка всех диалогов
fastify.get('/api/conversations', async () => {
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
    // Для демо берем последнее сообщение как превью
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
  return { conversations };
});

// Получение истории сообщений
fastify.get('/api/conversations/:id/messages', async (request, reply) => {
  const { id } = request.params as { id: string };

  try {
    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, name: true, avatarUrl: true, role: true } } },
    });
    return { messages };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch messages' });
  }
});

// Отправка сообщения из админки (оператор перехватывает диалог)
fastify.post('/api/conversations/:id/messages', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { content } = (request.body || {}) as { content?: string };

  if (!content?.trim()) {
    return reply.status(400).send({ error: 'content is required' });
  }

  try {
    const conversation = await prisma.conversation.findUnique({ where: { id } });
    if (!conversation) {
      return reply.status(404).send({ error: 'Conversation not found' });
    }

    // В реальности тут ID авторизованного оператора. Для демо — Admin Support.
    let adminUser = await prisma.user.findFirst({
      where: {
        projectId: conversation.projectId,
        name: 'Admin Support',
        role: 'admin',
      },
    });

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          projectId: conversation.projectId,
          externalId: '__nativechat_admin__',
          name: 'Admin Support',
          role: 'admin',
        },
      });
    }

    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        senderId: adminUser.id,
        conversationId: id,
        type: 'text',
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    // Тот же формат, что и WS-пайплайн → виджет клиента получает сразу
    await publishEvent(id, {
      type: 'new_message',
      payload: message,
    });

    return { message };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to send admin message' });
  }
});

// --- RAG Knowledge base ---

fastify.post('/api/knowledge', async (request, reply) => {
  const { content, projectId } = (request.body || {}) as {
    content?: string;
    projectId?: string;
  };

  if (!content?.trim()) {
    return reply.status(400).send({ error: 'content is required' });
  }

  if (!hasGeminiKey()) {
    return reply.status(503).send({
      error: 'GEMINI_API_KEY is not configured',
      hint: 'Add GEMINI_API_KEY to apps/api/.env (Google AI Studio)',
    });
  }

  try {
    let project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId } })
      : await prisma.project.findFirst({ orderBy: { updatedAt: 'desc' } });

    if (!project) {
      return reply.status(400).send({ error: 'Project not found' });
    }

    const saved = await storeKnowledge(prisma, project.id, content.trim());
    return { success: true, id: saved.id, projectId: project.id };
  } catch (error) {
    fastify.log.error({ error }, 'Embedding error');
    return reply.status(500).send({ error: 'Failed to generate embedding' });
  }
});

fastify.get('/api/knowledge', async (request, reply) => {
  const { projectId } = (request.query || {}) as { projectId?: string };
  try {
    const project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId } })
      : await prisma.project.findFirst({ orderBy: { updatedAt: 'desc' } });

    if (!project) return { items: [] };

    const items = await prisma.knowledge.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, content: true, createdAt: true, projectId: true },
    });
    return { items, projectId: project.id, geminiConfigured: hasGeminiKey() };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to list knowledge' });
  }
});

// --- BYO Agent config ---

/** Save project settings (custom agent webhook URL) */
fastify.patch('/api/projects', async (request, reply) => {
  const body = (request.body || {}) as {
    agentUrl?: string | null;
    projectId?: string;
  };

  try {
    const project = body.projectId
      ? await prisma.project.findUnique({ where: { id: body.projectId } })
      : await prisma.project.findFirst({ orderBy: { updatedAt: 'desc' } });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const raw = body.agentUrl;
    const agentUrl =
      raw === undefined
        ? undefined
        : raw === null || String(raw).trim() === ''
          ? null
          : String(raw).trim();

    if (agentUrl !== undefined && agentUrl !== null) {
      try {
        const parsed = new URL(agentUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return reply.status(400).send({ error: 'agentUrl must be http(s)' });
        }
      } catch {
        return reply.status(400).send({ error: 'agentUrl is not a valid URL' });
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id: project.id },
      data: agentUrl === undefined ? {} : { agentUrl },
    });

    return {
      project: {
        id: updatedProject.id,
        name: updatedProject.name,
        agentUrl: updatedProject.agentUrl,
        agentProvider: updatedProject.agentProvider,
      },
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to update project' });
  }
});

fastify.get('/api/projects', async (request, reply) => {
  const { projectId } = (request.query || {}) as { projectId?: string };
  try {
    const project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId } })
      : await prisma.project.findFirst({ orderBy: { updatedAt: 'desc' } });

    if (!project) return reply.status(404).send({ error: 'Project not found' });

    return {
      project: {
        id: project.id,
        name: project.name,
        agentUrl: project.agentUrl,
        agentProvider: project.agentProvider,
        mcpServerUrl: project.mcpServerUrl,
      },
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch project' });
  }
});

fastify.get('/api/projects/:id/agent', async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return reply.status(404).send({ error: 'Project not found' });
    return { agent: toPublicAgentConfig(project) };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch agent config' });
  }
});

fastify.put('/api/projects/:id/agent', async (request, reply) => {
  const { id } = request.params as { id: string };
  const body = request.body as {
    provider?: string;
    mcpServerUrl?: string | null;
    mcpToolName?: string | null;
    mcpAuthToken?: string | null;
  };

  if (!body.provider || !['free_mini', 'mcp'].includes(body.provider)) {
    return reply.status(400).send({ error: 'provider must be free_mini or mcp' });
  }

  if (body.provider === 'mcp' && !body.mcpServerUrl) {
    return reply.status(400).send({ error: 'mcpServerUrl is required for mcp provider' });
  }

  try {
    const data: Record<string, unknown> = {
      agentProvider: body.provider,
    };

    if (body.provider === 'mcp') {
      data.mcpServerUrl = body.mcpServerUrl;
      if (body.mcpToolName !== undefined) {
        data.mcpToolName = body.mcpToolName || 'chat';
      }
      if (body.mcpAuthToken !== undefined) {
        data.mcpAuthToken = body.mcpAuthToken; // null clears
      }
    } else {
      // Switching back to free mini — keep MCP fields stored but unused
    }

    const project = await prisma.project.update({
      where: { id },
      data,
    });

    return { agent: toPublicAgentConfig(project) };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to update agent config' });
  }
});

/** Available agent options for the selector UI */
fastify.get('/api/agents/options', async () => {
  return {
    options: [
      {
        provider: 'free_mini',
        label: 'GPT Mini (Free)',
        isFree: true,
        description:
          'После auto-tune — бесплатный чат. Setup-токены на это не тратятся.',
      },
      {
        provider: 'mcp',
        label: 'Your Agent (MCP)',
        isFree: false,
        description:
          'После auto-tune подключите своего агента. Чат идёт на ваших токенах.',
      },
    ],
  };
});

// --- Limited setup tokens + product auto-tune ---

fastify.get('/api/projects/:id/setup', async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return reply.status(404).send({ error: 'Project not found' });
    return { setup: publicSetupState(project) };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch setup budget' });
  }
});

fastify.post('/api/projects/:id/setup/estimate', async (request, reply) => {
  const { id } = request.params as { id: string };
  const body = (request.body || {}) as {
    productUrl?: string;
    productName?: string;
    pageChars?: number;
  };

  try {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return reply.status(404).send({ error: 'Project not found' });

    const estimate = estimateAutoTuneTokens({
      productUrl: body.productUrl ?? project.productUrl,
      productName: body.productName ?? project.productName,
      pageChars: body.pageChars,
    });

    return {
      estimate,
      setup: toSetupBudgetSnapshot(project, {
        productUrl: body.productUrl ?? project.productUrl,
        productName: body.productName ?? project.productName,
        pageChars: body.pageChars,
      }),
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to estimate setup tokens' });
  }
});

fastify.post('/api/projects/:id/setup/auto-tune', async (request, reply) => {
  const { id } = request.params as { id: string };
  const body = (request.body || {}) as {
    productUrl?: string;
    productName?: string;
  };

  try {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return reply.status(404).send({ error: 'Project not found' });

    const result = await runAutoTune({
      productUrl: body.productUrl ?? project.productUrl,
      productName: body.productName ?? project.productName,
      setupTokenBudget: project.setupTokenBudget,
      setupTokensUsed: project.setupTokensUsed,
      setupCompletedAt: project.setupCompletedAt,
    });

    if (!result.ok) {
      const status = result.code === 'insufficient_setup_tokens' ? 402 : 400;
      return reply.status(status).send(result);
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        productUrl: result.productUrl,
        productName: result.productName,
        themeTokens: result.themeTokens as object,
        welcomeMessage: result.welcomeMessage,
        setupTokensUsed: { increment: result.tokensCharged },
        setupCompletedAt: new Date(),
        // After tune, default ongoing chat to free mini (MCP optional next)
        agentProvider: project.agentProvider || 'free_mini',
      },
    });

    return {
      ok: true,
      tokensCharged: result.tokensCharged,
      estimate: result.estimate,
      setup: publicSetupState(updated),
      agent: toPublicAgentConfig(updated),
      nextStep: {
        message:
          'Автонастройка готова. Дальше используйте GPT Mini (Free) или подключите своего агента через MCP.',
        agents: ['free_mini', 'mcp'],
      },
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Auto-tune failed' });
  }
});


const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const pub = new Redis(REDIS_URL);
const sub = new Redis(REDIS_URL);

sub.subscribe('chat_events');

sub.on('message', (channel, message) => {
  if (channel === 'chat_events') {
    const data = JSON.parse(message);
    const { roomId, payload } = data;

    const roomClients = rooms.get(roomId);
    if (roomClients) {
      const broadcastData = JSON.stringify(payload);
      roomClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(broadcastData);
        }
      });
    }
  }
});

const rooms = new Map<string, Set<WebSocket>>();

async function publishEvent(roomId: string, payload: unknown) {
  await pub.publish(
    'chat_events',
    JSON.stringify({
      roomId,
      payload,
    })
  );
}

async function replyWithAgent(conversationId: string, userText: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { project: true },
  });
  if (!conversation) return;

  const bot = await getOrCreateAiBot(prisma, conversation.projectId);

  // Presence: agent is "typing"
  await publishEvent(conversationId, {
    type: 'typing_start',
    payload: { userId: bot.id, name: bot.name },
  });

  try {
    const recent = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: { sender: { select: { externalId: true } } },
    });

    const history = recent
      .reverse()
      .map((m) => ({
        role: m.sender.externalId === '__nativechat_ai_bot__' ? 'assistant' : 'user',
        content: m.content,
      }))
      .filter((m) => m.content && m.content !== userText);

    const reply = await generateAgentReply({
      project: conversation.project,
      userMessage: userText,
      conversationId,
      history,
    });

    const saved = await prisma.message.create({
      data: {
        content: reply.content,
        senderId: bot.id,
        conversationId,
        type: 'text',
        metadata: {
          agentProvider: reply.provider,
          model: reply.model ?? null,
          error: reply.error ?? null,
        },
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    await publishEvent(conversationId, {
      type: 'new_message',
      payload: saved,
    });
  } catch (err) {
    fastify.log.error({ err }, 'Agent reply failed');
  } finally {
    await publishEvent(conversationId, {
      type: 'typing_stop',
      payload: { userId: bot.id, name: bot.name },
    });
  }
}

fastify.ready((err) => {
  if (err) throw err;

  const wss = new WebSocketServer({ server: fastify.server });

  wss.on('connection', (ws: WebSocket, req) => {
    const { query } = parse(req.url || '', true);
    const token = query.token as string;

    if (!token) {
      ws.close(1008, 'Token required');
      return;
    }

    let user: any;
    try {
      user = fastify.jwt.verify(token);
    } catch (e) {
      ws.close(1008, 'Invalid token');
      return;
    }

    let currentRoom: string | null = null;

    ws.on('message', async (rawMessage) => {
      try {
        const data = JSON.parse(rawMessage.toString());

        if (data.type === 'join_room') {
          const { conversationId } = data.payload;
          currentRoom = conversationId;

          if (!rooms.has(conversationId)) {
            rooms.set(conversationId, new Set());
          }
          rooms.get(conversationId)!.add(ws);

          await publishEvent(currentRoom!, {
            type: 'user_joined',
            payload: { userId: user.userId, name: user.name },
          });

          fastify.log.info(`User ${user.userId} joined room ${conversationId}`);
        }

        if (data.type === 'send_message' && currentRoom) {
          const { content } = data.payload;

          let messageType = 'text';
          let messageMetadata = null;

          // Тестовый триггер для карточки тарифов (имитация AI)
          if (content.trim() === '/pricing') {
            messageType = 'pricing_card';
            messageMetadata = {
              title: 'NativeChat Pro',
              price: 99,
              features: ['Безлимит чатов', 'AI Ассистент', 'Custom UI Карточки'],
            };
          }

          const savedMessage = await prisma.message.create({
            data: {
              content: content.trim() === '/pricing' ? 'Тарифные планы' : content,
              senderId: user.userId,
              conversationId: currentRoom,
              type: messageType,
              metadata: messageMetadata || undefined,
            },
            include: {
              sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
            },
          });

          await publishEvent(currentRoom, {
            type: 'new_message',
            payload: savedMessage,
          });

          // Kick off RAG (if knowledge hit) or BYO-agent fallback
          if (content.trim() !== '/pricing') {
            const roomId = currentRoom;
            const senderId = user.userId as string;
            const userText = content.trim();
            setImmediate(() => {
              void (async () => {
                try {
                  const sender = await prisma.user.findUnique({ where: { id: senderId } });
                  // Operators / bots don't trigger auto-replies
                  if (sender?.role === 'admin' || sender?.role === 'bot') return;

                  const conversation = await prisma.conversation.findUnique({
                    where: { id: roomId },
                    include: { project: true },
                  });
                  if (!conversation?.project) return;

                  const project = conversation.project;

                  // 0) Custom agent webhook (BYOA) — highest priority when URL is set
                  if (project.agentUrl) {
                    const bot = await getOrCreateAiBot(prisma, project.id);
                    await publishEvent(roomId, {
                      type: 'typing_start',
                      payload: { userId: bot.id, name: bot.name },
                    });

                    try {
                      const result = await callAgentWebhook(project.agentUrl, {
                        conversationId: roomId,
                        message: userText,
                        projectId: project.id,
                      });

                      if (result.ok) {
                        const aiMessage = await prisma.message.create({
                          data: {
                            content: result.data.text,
                            senderId: bot.id,
                            conversationId: roomId,
                            type: result.data.type || 'text',
                            metadata: {
                              source: 'byoa_webhook',
                              agentUrl: project.agentUrl,
                              ...(result.data.metadata || {}),
                            },
                          },
                          include: {
                            sender: {
                              select: { id: true, name: true, avatarUrl: true, role: true },
                            },
                          },
                        });
                        await publishEvent(roomId, {
                          type: 'new_message',
                          payload: aiMessage,
                        });
                        return; // skip RAG / free_mini when BYOA answered
                      }

                      fastify.log.warn(
                        { error: result.error },
                        'BYOA webhook failed — falling back to RAG / free agent'
                      );
                    } catch (byoaErr) {
                      fastify.log.error({ byoaErr }, 'BYOA webhook error');
                    } finally {
                      await publishEvent(roomId, {
                        type: 'typing_stop',
                        payload: { userId: bot.id, name: bot.name },
                      });
                    }
                  }

                  // 1) RAG over Knowledge (Gemini embeddings + flash)
                  if (hasGeminiKey()) {
                    try {
                      const hit = await findRelevantKnowledge(
                        prisma,
                        conversation.projectId,
                        userText
                      );
                      if (hit) {
                        const aiText = await generateRagAnswer(userText, hit.content);
                        const bot = await getOrCreateAiBot(prisma, conversation.projectId);
                        const aiMessage = await prisma.message.create({
                          data: {
                            content: aiText,
                            senderId: bot.id,
                            conversationId: roomId,
                            type: 'text',
                            metadata: {
                              source: 'rag',
                              similarity: hit.similarity,
                            },
                          },
                          include: {
                            sender: {
                              select: { id: true, name: true, avatarUrl: true, role: true },
                            },
                          },
                        });
                        await publishEvent(roomId, {
                          type: 'new_message',
                          payload: aiMessage,
                        });
                        return; // skip free_mini / mcp when RAG answered
                      }
                    } catch (ragErr) {
                      fastify.log.error({ ragErr }, 'RAG reply failed — falling back to agent');
                    }
                  }

                  // 2) Fallback: free mini or customer's MCP agent
                  await replyWithAgent(roomId, userText);
                } catch (e) {
                  fastify.log.error({ e }, 'agent reply failed');
                  try {
                    await replyWithAgent(roomId, userText);
                  } catch (fallbackErr) {
                    fastify.log.error({ fallbackErr }, 'replyWithAgent');
                  }
                }
              })();
            });
          }
        }

        if (data.type === 'typing_start' && currentRoom) {
          await publishEvent(currentRoom, {
            type: 'typing_start',
            payload: { userId: user.userId, name: user.name },
          });
        }

        if (data.type === 'typing_stop' && currentRoom) {
          await publishEvent(currentRoom, {
            type: 'typing_stop',
            payload: { userId: user.userId, name: user.name },
          });
        }
      } catch (err) {
        fastify.log.error({ err }, 'WS Error');
      }
    });

    ws.on('close', () => {
      if (currentRoom) {
        publishEvent(currentRoom, {
          type: 'user_left',
          payload: { userId: user.userId, name: user.name },
        }).catch(() => {});

        if (rooms.has(currentRoom)) {
          rooms.get(currentRoom)!.delete(ws);
          if (rooms.get(currentRoom)!.size === 0) {
            rooms.delete(currentRoom);
          }
        }
      }
    });
  });
});

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('🚀 NativeChat API running on http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
