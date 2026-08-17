# NativeChat / Nativiq — полный контекст (handoff)

Дата среза: 2026-08-17  
Репозиторий: `RomanKamiskiy/nativechat`  
Язык общения с владельцем: **русский**  
Продукт в UI/промптах часто называется **Nativiq**, пакеты/репо — **NativeChat**.

---

## 1. Что это за продукт

Омниканальный чат-виджет + админка + SDK:

- **Виджет** (`apps/web` + `packages/react-sdk`) встраивается на сайт клиента.
- **Админка** (`apps/dashboard`) — inbox оператора, обучение RAG, BYOA URL.
- **API** (`apps/api`) — Fastify + WS + Prisma/Postgres(pgvector) + Redis + Gemini RAG + BYOA webhook + Telegram.

### Бизнес-модель токенов (важное решение)

- **Не** продаём тарифы на «токены чата».
- На проект: ограниченный **setup-бюджет** (дефолт **8000**) только на one-shot автонастройку темы/welcome.
- После setup: чат через **Gemini Flash** (бесплатный встроенный) или **агент клиента** (`agentUrl` webhook / MCP).
- Риск платформы — массовый free-чат, не setup-копейки.

---

## 2. Структура монорепо

```
apps/api          — Fastify API :3001, WS, Prisma, RAG, Telegram
apps/web          — Vite демо-лендинг AcmeCorp + плавающий виджет :5173
apps/dashboard    — Vite админка оператора :5174
packages/react-sdk — ChatWidget, MessageList, PricingCard, SetupPanel, AgentSelector
packages/shared-types
```

Prisma schema: **`apps/api/prisma/schema.prisma`** (не `packages/database`).

---

## 3. Ветки и PR (все draft)

Самая полная ветка (верхушка стека): **`cursor/telegram-webhook-e0a2`**

| PR | Ветка | Суть |
|----|--------|------|
| [#1](https://github.com/RomanKamiskiy/nativechat/pull/1) | `cursor/byo-agent-mcp-e0a2` | Epic 7 dashboard + Epic 8 RAG (база) |
| [#2](https://github.com/RomanKamiskiy/nativechat/pull/2) | `cursor/web-saas-landing-e0a2` | AcmeCorp лендинг + floating widget + `accentColor` |
| [#3](https://github.com/RomanKamiskiy/nativechat/pull/3) | `cursor/epic9-byoa-webhook-e0a2` | `Project.agentUrl`, PATCH `/api/projects`, BYOA first |
| [#4](https://github.com/RomanKamiskiy/nativechat/pull/4) | `cursor/e2e-unlimited-tokens-e0a2` | `DISABLE_TOKEN_LIMITS` для локального E2E |
| [#5](https://github.com/RomanKamiskiy/nativechat/pull/5) | `cursor/gemini-flash-fallback-e0a2` | Убран хардкод `[GPT Mini · free]`, всегда Gemini |
| [#6](https://github.com/RomanKamiskiy/nativechat/pull/6) | `cursor/rag-similarity-0.5-e0a2` | Порог RAG **0.5**, жёсткий grounded-промпт |
| [#7](https://github.com/RomanKamiskiy/nativechat/pull/7) | `cursor/generative-ui-pricing-e0a2` | Тег `[UI:PRICING_CARD]` → PricingCard в SDK |
| [#8](https://github.com/RomanKamiskiy/nativechat/pull/8) | `cursor/telegram-webhook-e0a2` | Telegram webhook + auto setWebhook |

**На 2026-08-17 checkout в cloud VM может быть на `cursor/byo-agent-mcp-e0a2`.**  
Чтобы получить всё: `git checkout cursor/telegram-webhook-e0a2`.

Рекомендуемый merge-порядок в `main`:  
`#1 → #2 → #3 → #4 → #5 → #6 → #7 → #8`  
(или squash merge только `#8`, т.к. она содержит предков).

---

## 4. Архитектура ответа бота (приоритет)

После `send_message` (WS) / Telegram webhook:

1. **BYOA** — если у `Project.agentUrl` задан URL → `POST` webhook клиента  
   Ожидание: `{ text, type?, metadata? }`. При успехе — стоп.
2. **Gemini Flash** (если есть `GEMINI_API_KEY`):
   - embedding → pgvector search;
   - если `similarity >= RAG_SIMILARITY_THRESHOLD` (дефолт **0.5**) → grounded ответ (`source: rag`);
   - иначе → общий ассистент Nativiq (`source: gemini_flash`).
3. **Legacy router** `replyWithAgent` — MCP / free_mini только если Gemini недоступен.

Redis pub/sub формат (не ломать):

```ts
publishEvent(roomId, { type: 'new_message', payload: message })
// Redis: { roomId, payload }
```

JWT **без role** — роль берётся из `User` в БД. Admin/bot не триггерят auto-reply.

---

## 5. Ключевые файлы

### API
- `apps/api/src/index.ts` — HTTP + WS + маршруты
- `apps/api/src/rag/gemini.ts` — embeddings, RAG, general Flash, промпты, `[UI:PRICING_CARD]`
- `apps/api/src/agents/webhook.ts` — BYOA HTTP client
- `apps/api/src/agents/service.ts` — free_mini/MCP router (free_mini → Gemini если ключ есть)
- `apps/api/src/agents/mockWebhookAgent.mjs` — локальная заглушка BYOA `:3099`
- `apps/api/src/telegram/webhook.ts` — обработчик TG
- `apps/api/src/telegram/registerWebhook.ts` — auto setWebhook при старте
- `apps/api/src/telegram/setWebhook.mjs` — `npm run telegram:set-webhook`
- `apps/api/src/setup/budget.ts` — setup-токены + `DISABLE_TOKEN_LIMITS`

### SDK
- `packages/react-sdk/src/components/ChatWidget.tsx` — `accentColor`, `--nc-accent`
- `packages/react-sdk/src/components/MessageList.tsx` — парсинг `[UI:PRICING_CARD]` → `PricingCard`
- `packages/react-sdk/src/components/MessageInput.tsx` — `disabled={false}` для E2E
- `packages/react-sdk/src/components/cards/PricingCard.tsx`

### Web / Dashboard
- `apps/web/src/App.tsx` — AcmeCorp лендинг, виджет bottom-right, `accentColor="#4f46e5"`, setup/agent панели скрыты
- `apps/web/tailwind.config.js` — content включает `../../packages/react-sdk/src/**`
- `apps/dashboard/src/App.tsx` — inbox + AI tab (BYOA URL + «Обучить ИИ»)

---

## 6. Модели Gemini (важно)

Новые API-ключи Google:

- `gemini-2.5-flash` / `gemini-1.5-flash` → часто **404**
- Рабочий чат: **`gemini-flash-latest`** (`GEMINI_CHAT_MODEL`)
- Embeddings: **`gemini-embedding-001`** с `outputDimensionality: 768` (`Knowledge.embedding vector(768)`)

Порог RAG: `RAG_SIMILARITY_THRESHOLD=0.5`  
Промпт RAG жёстко: отвечать **только** по фрагменту Knowledge + инструкция про `[UI:PRICING_CARD]`.

---

## 7. Generative UI

Бэкенд (оба промпта — RAG и general) требуют:

> Если вопрос про тарифы/цену/оплату — в конец ответа добавить `[UI:PRICING_CARD]`. Иначе тег не использовать.

- **Web SDK:** MessageList снимает тег, рендерит `PricingCard` (Pro / $99).
- **Telegram:** тег снимается, вместо него `inline_keyboard` «Оплатить Pro ($99)» (`TELEGRAM_PAYMENT_URL` / `TELEGRAM_BOT_USERNAME`).

Легаси-триггер виджета: сообщение `/pricing` → `type: pricing_card` без LLM.

---

## 8. Epic 9 — BYOA (`agentUrl`)

- Поле `Project.agentUrl` + миграция `20260812102012_add_project_agent_url`
- `PATCH /api/projects` `{ agentUrl }` (+ `GET /api/projects`)
- В админке AI-вкладка: поле URL + «Сохранить URL»
- Приоритет выше RAG
- Mock: `node apps/api/src/agents/mockWebhookAgent.mjs` → `http://127.0.0.1:3099/agent`

Параллельно остаётся старый MCP-путь (`agentProvider` / `mcpServerUrl`) через селектор в виджете.

---

## 9. Telegram

- `POST /api/telegram/webhook` → всегда `{ ok: true }`
- User: `externalId = tg:{chatId}`
- Тот же `generateGeminiFallbackReply`
- Сообщения пишутся в conversation проекта (видны в dashboard)
- Авто-регистрация при старте, если задан `PUBLIC_API_URL` или `TUNNEL_URL`
- Helper: `cd apps/api && npm run telegram:set-webhook -- https://HOST`

Бот (на момент активации 2026-08-12): `@testchat6663331290bot`  
Токен хранить **только** в `apps/api/.env` (gitignored). Токен светился в чате с агентом — при необходимости **перевыпустить в BotFather**.

---

## 10. Env (`apps/api/.env`, не коммитить)

Типичный набор:

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
JWT_SECRET=...

GEMINI_API_KEY=...
GEMINI_EMBED_MODEL=gemini-embedding-001
GEMINI_EMBED_DIMS=768
GEMINI_CHAT_MODEL=gemini-flash-latest
RAG_SIMILARITY_THRESHOLD=0.5

DISABLE_TOKEN_LIMITS=true   # локальный E2E: tokensLeft=9999999

TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=testchat6663331290bot
TELEGRAM_PAYMENT_URL=https://t.me/testchat6663331290bot
PUBLIC_API_URL=https://....trycloudflare.com
TUNNEL_URL=https://....trycloudflare.com
```

См. также `apps/api/.env.example`.

---

## 11. Порты и прокси

| Сервис | Порт |
|--------|------|
| API + WS | 3001 |
| Web demo | 5173 |
| Dashboard | 5174 |
| Mock BYOA | 3099 |

Vite proxy (`apps/web`, `apps/dashboard`): `/api` и `/ws` → `127.0.0.1:3001`  
Same-origin URLs через `getDemoApiUrl()` / `getApiBase()` — чтобы работали туннели.

Cloudflare quick tunnels с VM часто ротируются; Cloudflare DNS с некоторых сетей нестабилен → иногда localtunnel + IP interstitial.

---

## 12. Схема данных (кратко)

`Project`: agentProvider, mcp*, **agentUrl**, setupToken*, themeTokens, welcomeMessage…  
`User`: role `user|admin|bot`, unique `(projectId, externalId)`  
`Conversation`, `Message` (type/metadata JSON)  
`Knowledge`: content + `embedding Unsupported("vector(768)")`

Демо-проект с knowledge: name **`operator-relay-test`** (в web App зашит).  
Факт в KB: «Тариф Pro стоит 99 долларов…».

---

## 13. SDK theming

- Проп `accentColor` (демо: `#4f46e5` = indigo-600 AcmeCorp)
- CSS vars: `--nc-accent`, `--nc-primary`, `--nc-user-bubble`, …
- SetupPanel / AgentSelector тоже через `var(--nc-accent)`

---

## 14. E2E / проверки (что уже прогоняли)

- RAG: «Сколько стоит тариф Pro?» → ответ с 99, `source: rag`, similarity ~0.84
- Gemini general: «Привет!» → живой ответ, `source: gemini_flash` (не GPT Mini stub)
- BYOA mock: `metadata.source: byoa_webhook`
- Generative UI: модель ставит `[UI:PRICING_CARD]` на ценовые вопросы, на «Привет» — нет
- Telegram: `setWebhook` ok на CF URL; health `configured: true`

---

## 15. Как поднять локально

```bash
# DB + Redis + pgvector уже нужны
cd apps/api && npx prisma migrate deploy && npm run dev   # :3001

# optional
node src/agents/mockWebhookAgent.mjs                      # :3099
npm run telegram:set-webhook -- "$PUBLIC_API_URL"

cd ../web && npm run dev                                  # :5173
cd ../dashboard && npm run dev                            # :5174

# публичный API для Telegram
npx cloudflared tunnel --url http://127.0.0.1:3001
# прописать PUBLIC_API_URL и перезапустить API / set-webhook
```

Полный код стека:

```bash
git fetch origin
git checkout cursor/telegram-webhook-e0a2
```

---

## 16. Открытые хвосты / next

1. **Смержить ветки в `main`** (сейчас 8 draft PR, разъехались).
2. Обновить/держать живой туннель для Telegram (CF URL ротируется).
3. Operator auth в dashboard; шифрование `mcpAuthToken`.
4. Rate-limit на free Gemini-чат.
5. Не коммитить секреты; ротировать TG token если утёк.
6. При желании — единый «integration» PR из `telegram-webhook-e0a2` в main.

---

## 17. Коммуникация / правила владельца

- Ответы агента — **на русском**.
- Код/commits — English ok.
- Frontend design rules (из user rules): не дефолтный purple-AI look; на демо AcmeCorp indigo сознательно как «сайт клиента».
- Cloud agent: ветки `cursor/<name>-e0a2`, PR через ManagePullRequest, не `gh pr create`.

---

## 18. Быстрый glossary

| Термин | Значение |
|--------|----------|
| RAG | Knowledge + embeddings + grounded Gemini |
| BYOA | Bring Your Own Agent = `agentUrl` webhook |
| MCP | Альтернативный BYO через JSON-RPC MCP |
| Generative UI | LLM отдаёт тег → SDK/Telegram рисует UI |
| Setup tokens | Только auto-tune темы, не чат |
| free_mini | Историческое имя; фактически Gemini Flash |

---

*Конец handoff. Этот файл — снимок контекста для продолжения работы другим агентом/человеком.*
