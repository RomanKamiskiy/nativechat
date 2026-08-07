# NativeChat

AI-native Headless Chat SDK and Messaging Infrastructure.

## Structure

```
nativechat/
├── apps/
│   ├── api/           # Backend, WebSockets, REST
│   └── web/           # Developer Console & Landing (Vite demo)
├── packages/
│   ├── react-sdk/     # Headless UI primitives & hooks
│   └── shared-types/  # Shared TypeScript interfaces
└── docker-compose.yml
```

## BYO Agent (no token tariffs)

Heavy chat usage should not force NativeChat into paid token plans.
Each project picks an agent:

| Provider | Who pays | How |
|---|---|---|
| `free_mini` | Platform (lightweight GPT Mini) | Built-in, default |
| `mcp` | You | Your agent URL via MCP (`tools/call`) |

In the widget header: **Agent → GPT Mini (Free)** or **Your Agent (MCP)**.

API:

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
