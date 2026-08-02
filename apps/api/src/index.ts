import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const fastify = Fastify({ logger: true });

// Регистрация плагинов
fastify.register(cors, { origin: '*' }); // Для MVP разрешаем всё
fastify.register(jwt, { secret: process.env.JWT_SECRET || 'super-secret-nativechat-key' });

// Тестовый роут для проверки работоспособности
fastify.get('/health', async () => {
  return { status: 'ok', service: 'NativeChat API' };
});

// Эндпоинт генерации токена для юзера (Mock для MVP)
fastify.post('/api/auth/token', async (request, reply) => {
  const { projectId, userId, name } = request.body as any;

  if (!projectId || !userId || !name) {
    return reply.status(400).send({ error: 'Missing required fields' });
  }

  // В реальном приложении здесь будет проверка секретного ключа проекта
  // и создание/апдейт юзера в БД. Пока просто выдаем токен.
  
  const token = fastify.jwt.sign({ projectId, userId, name });
  return { token };
});

// Эндпоинт для получения истории сообщений в чате
fastify.get('/api/conversations/:conversationId/messages', async (request, reply) => {
  const { conversationId } = request.params as { conversationId: string };
  
  try {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true } // Не отдаем лишние данные
        }
      }
    });
    
    return { messages };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch messages' });
  }
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
