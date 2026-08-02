# NativeChat

AI-native Headless Chat SDK and Messaging Infrastructure.

## Structure

```
nativechat/
├── apps/
│   ├── api/           # Backend, WebSockets, REST
│   └── web/           # Developer Console & Landing (Next.js)
├── packages/
│   ├── react-sdk/     # Headless UI primitives & hooks
│   └── shared-types/  # Shared TypeScript interfaces
└── docker-compose.yml
```

## Local infrastructure

```bash
docker compose up -d
```

- PostgreSQL: `localhost:5432` (user/password/db: `nativechat`)
- Redis: `localhost:6379`

Stop:

```bash
docker compose down
```
