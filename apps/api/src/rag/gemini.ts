import { GoogleGenerativeAI } from '@google/generative-ai';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
// gemini-2.5-flash is listed but returns 404 for new API keys — use stable alias
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-flash-latest';
const EMBED_DIMS = Number(process.env.GEMINI_EMBED_DIMS || 768);
const SIMILARITY_THRESHOLD = Number(process.env.RAG_SIMILARITY_THRESHOLD || 0.5);

function getGenAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  return new GoogleGenerativeAI(key);
}

// Gemini Flash is occasionally overloaded (429/503) — retry a few times before giving up.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (!status || !RETRYABLE_STATUS.has(status) || attempt === attempts - 1) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw new Error('unreachable');
}

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Format float array for pgvector input: [0.1,0.2,...] */
function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

export async function embedText(content: string): Promise<number[]> {
  const genAI = getGenAI();
  const embedModel = genAI.getGenerativeModel({ model: EMBED_MODEL });
  // gemini-embedding-001 defaults to 3072; request 768 to match Knowledge.embedding
  const result = await withRetry(() =>
    embedModel.embedContent({
      content: { parts: [{ text: content }] },
      outputDimensionality: EMBED_DIMS,
    } as any)
  );
  const values = result.embedding?.values;
  if (!values?.length) {
    throw new Error('Empty embedding from Gemini');
  }
  if (values.length !== EMBED_DIMS) {
    throw new Error(`Expected embedding dim ${EMBED_DIMS}, got ${values.length}`);
  }
  return values;
}

export async function storeKnowledge(
  prisma: PrismaClient,
  projectId: string,
  content: string
): Promise<{ id: string }> {
  const embedding = await embedText(content);
  const id = randomUUID();
  const vectorLiteral = toVectorLiteral(embedding);

  // Unsupported("vector") — insert via raw SQL
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Knowledge" ("id", "projectId", "content", "embedding", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4::vector, NOW(), NOW())`,
    id,
    projectId,
    content,
    vectorLiteral
  );

  return { id };
}

export async function findRelevantKnowledge(
  prisma: PrismaClient,
  projectId: string,
  query: string
): Promise<{ content: string; similarity: number } | null> {
  const embedding = await embedText(query);
  const vectorLiteral = toVectorLiteral(embedding);

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT content, 1 - (embedding <=> $1::vector) AS similarity
     FROM "Knowledge"
     WHERE "projectId" = $2 AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT 1`,
    vectorLiteral,
    projectId
  )) as Array<{ content: string; similarity: number | string }>;

  if (!rows.length) return null;

  const similarity = Number(rows[0].similarity);
  if (!Number.isFinite(similarity) || similarity < SIMILARITY_THRESHOLD) {
    return null;
  }

  return { content: rows[0].content, similarity };
}

const UI_PRICING_CARD_TAG = '[UI:PRICING_CARD]';

const UI_PRICING_INSTRUCTION =
  `Если пользователь спрашивает про тарифы, стоимость, цену или хочет купить/оплатить подписку, ` +
  `ОБЯЗАТЕЛЬНО добавь в самый конец своего ответа специальный тег: ${UI_PRICING_CARD_TAG}. ` +
  `В остальных случаях этот тег не используй.`;

export async function generateRagAnswer(
  userQuestion: string,
  knowledge: string
): Promise<string> {
  const genAI = getGenAI();
  const chatModel = genAI.getGenerativeModel({ model: CHAT_MODEL });
  const prompt =
    `Ты — ассистент поддержки. Пользователь спросил: "${userQuestion}".\n` +
    `Ниже — ЕДИНСТВЕННЫЙ допустимый источник ответа (фрагмент базы знаний):\n` +
    `"""${knowledge}"""\n` +
    `Правила:\n` +
    `1) Ответь вежливо и по делу, опираясь ТОЛЬКО на текст выше.\n` +
    `2) Не придумывай факты, цены, ссылки или шаги, которых нет в фрагменте.\n` +
    `3) Если во фрагменте нет полного ответа — скажи только то, что там есть, и коротко отметь, чего не хватает.\n` +
    `4) Отвечай на языке пользователя.\n` +
    `5) ${UI_PRICING_INSTRUCTION}`;

  const aiResponse = await withRetry(() => chatModel.generateContent(prompt));
  return aiResponse.response.text().trim();
}

export async function generateGeneralReply(userQuestion: string): Promise<string> {
  const genAI = getGenAI();
  const chatModel = genAI.getGenerativeModel({ model: CHAT_MODEL });
  const prompt =
    `Ты — вежливый ИИ-ассистент платформы Nativiq. ` +
    `Пользователь написал: "${userQuestion}". ` +
    `Ответь ему кратко, дружелюбно и естественно. ` +
    `Если это просто приветствие, поздоровайся в ответ. ` +
    `Отвечай на языке пользователя. ` +
    UI_PRICING_INSTRUCTION;

  const aiResponse = await withRetry(() => chatModel.generateContent(prompt));
  return aiResponse.response.text().trim();
}

/**
 * Always call Gemini Flash: grounded on Knowledge when similarity ≥ threshold,
 * otherwise a short general assistant reply (no hardcoded GPT Mini stub).
 */
export async function generateGeminiFallbackReply(
  prisma: PrismaClient,
  projectId: string,
  userQuestion: string
): Promise<{
  text: string;
  source: 'rag' | 'gemini_flash';
  similarity?: number;
  model: string;
}> {
  let hit: { content: string; similarity: number } | null = null;
  try {
    hit = await findRelevantKnowledge(prisma, projectId, userQuestion);
  } catch (err) {
    // Embedding / vector search failed — still answer with general Flash
    console.error('Knowledge search failed, using general Gemini reply:', err);
  }

  if (hit) {
    const text = await generateRagAnswer(userQuestion, hit.content);
    return {
      text,
      source: 'rag',
      similarity: hit.similarity,
      model: CHAT_MODEL,
    };
  }

  const text = await generateGeneralReply(userQuestion);
  return {
    text,
    source: 'gemini_flash',
    model: CHAT_MODEL,
  };
}

export { SIMILARITY_THRESHOLD, CHAT_MODEL };
