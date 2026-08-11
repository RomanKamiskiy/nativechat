# NativeChat

AI-native Headless Chat SDK and Messaging Infrastructure.

## Structure

```
nativechat/
├── apps/
│   ├── api/           # Backend, WebSockets, REST
│   ├── web/           # Widget demo (Vite)
│   └── dashboard/     # Operator admin (Nativiq) — :5174
├── packages/
│   ├── react-sdk/     # Headless UI primitives & hooks
│   └── shared-types/  # Shared TypeScript interfaces
└── docker-compose.yml
```

```bash
npm run dev:dashboard   # http://localhost:5174
```

## Token model (setup vs chat)

We do **not** sell chat-token tariffs. Flow:

1. **Setup budget** — each project gets a limited grant (default **8000** tokens) only to auto-tune the widget to the product (theme + welcome).
2. **Estimate** — before tune we calculate how many tokens that product needs.
3. **Auto-tune once** — spend from the setup budget and apply branding immediately.
4. **Ongoing chat** — GPT Mini (Free) or the customer's own agent via MCP. Setup tokens are not used for chat.

| Phase | Who pays | Notes |
|---|---|---|
| Auto-tune | Platform (limited) | One-shot setup budget |
| `free_mini` chat | Platform (lightweight) | After setup |
| `mcp` chat | Customer | BYO agent |

Widget: **Автонастройка продукта** → then **Agent → GPT Mini / MCP**.

API:

- `GET /api/projects/:id/setup`
- `POST /api/projects/:id/setup/estimate` `{ productUrl?, productName? }`
- `POST /api/projects/:id/setup/auto-tune` `{ productUrl?, productName? }`
- `GET /api/agents/options`
- `GET /api/projects/:id/agent`
- `PUT /api/projects/:id/agent` `{ provider, mcpServerUrl?, mcpToolName?, mcpAuthToken? }`

## Local infrastructure

```bash
docker compose up -d
cp apps/api/.env.example apps/api/.env
npm install
npm run db:migrate -w @nativechat/api
npm run dev:api
npm run dev:web
```

- PostgreSQL: `localhost:5432` (user/password: `postgres`/`password`, db: `nativechat`)
- Redis: `localhost:6379`

Stop:

```bash
docker compose down
```
