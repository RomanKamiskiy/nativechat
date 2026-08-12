import { GoogleGenerativeAI } from '@google/generative-ai';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
// gemini-2.5-flash is listed but returns 404 for new API keys — use stable alias
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-flash-latest';
const EMBED_DIMS = Number(process.env.GEMINI_EMBED_DIMS || 768);
const SIMILARITY_THRESHOLD = Number(process.env.RAG_SIMILARITY_THRESHOLD || 0.75);

function getGenAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  return new GoogleGenerativeAI(key);
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
  const result = await embedModel.embedContent({
    content: { parts: [{ text: content }] },
    outputDimensionality: EMBED_DIMS,
  } as any);
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

export async function generateRagAnswer(
  userQuestion: string,
  knowledge: string
): Promise<string> {
  const genAI = getGenAI();
  const chatModel = genAI.getGenerativeModel({ model: CHAT_MODEL });
  const prompt =
    `Пользователь спросил: "${userQuestion}". ` +
    `Ответь ему вежливо, используя ТОЛЬКО эту информацию: "${knowledge}". ` +
    `Если информация не отвечает на вопрос полностью, просто дай ту часть, что есть.`;

  const aiResponse = await chatModel.generateContent(prompt);
  return aiResponse.response.text().trim();
}

export { SIMILARITY_THRESHOLD };
