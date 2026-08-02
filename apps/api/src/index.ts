import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
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

// Хранилище подключений (RoomID -> Set of WebSockets)
const rooms = new Map<string, Set<WebSocket>>();

fastify.ready((err) => {
  if (err) throw err;

  const wss = new WebSocketServer({ server: fastify.server });

  wss.on('connection', (ws: WebSocket, req) => {
    // 1. Простая аутентификация через query-параметр ?token=...
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

        // Обработка входа в чат
        if (data.type === 'join_room') {
          const { conversationId } = data.payload;
          currentRoom = conversationId;

          if (!rooms.has(conversationId)) {
            rooms.set(conversationId, new Set());
          }
          rooms.get(conversationId)!.add(ws);
          
          fastify.log.info(`User ${user.userId} joined room ${conversationId}`);
        }

        // Обработка нового сообщения
        if (data.type === 'send_message' && currentRoom) {
          const { content } = data.payload;

          // 1. Сохраняем в БД
          const savedMessage = await prisma.message.create({
            data: {
              content,
              senderId: user.userId,
              conversationId: currentRoom,
              type: 'text'
            },
            include: {
              sender: { select: { id: true, name: true, avatarUrl: true } }
            }
          });

          // 2. Рассылаем всем участникам комнаты
          const roomClients = rooms.get(currentRoom);
          if (roomClients) {
            const broadcastData = JSON.stringify({
              type: 'new_message',
              payload: savedMessage
            });
            
            roomClients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(broadcastData);
              }
            });
          }
        }
      } catch (err) {
        fastify.log.error('WS Error:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoom && rooms.has(currentRoom)) {
        rooms.get(currentRoom)!.delete(ws);
        if (rooms.get(currentRoom)!.size === 0) {
          rooms.delete(currentRoom);
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
