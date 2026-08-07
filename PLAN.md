# NativeChat — Master Plan

**Vision:** The first AI-native Headless Chat SDK. Messaging Infrastructure that looks 100% native.

## Epic 1: Platform Core (Infrastructure & Database)
**Goal:** Setup monorepo, database schema, and basic backend API without UI.

- [ ] **Feature 1.1: Monorepo & Environment**
  - [ ] Initialize `pnpm` (or `npm`) workspaces.
  - [ ] Create folder structure: `apps/api`, `apps/web`, `packages/react-sdk`, `packages/shared-types`.
  - [ ] Write `docker-compose.yml` for local PostgreSQL and Redis.
- [ ] **Feature 1.2: Database Schema (ORM)**
  - [ ] Setup Prisma or Drizzle ORM.
  - [ ] Create core models: `Project`, `User`, `Conversation`, `Message`, `Participant`.
  - [ ] Configure and run initial migrations.
- [ ] **Feature 1.3: REST API Core**
  - [ ] Setup Express/Fastify in `apps/api`.
  - [ ] Implement JWT token generation and authentication.
  - [ ] Build basic CRUD endpoints for message history.

## Epic 2: Messaging Engine (Real-time)
**Goal:** Ensure low-latency data synchronization between clients.

- [ ] **Feature 2.1: WebSocket Server**
  - [ ] Setup `ws` server on top of Node.js.
  - [ ] Implement JWT auth on socket connection.
  - [ ] Handle core events: `join_room`, `send_message`.
- [ ] **Feature 2.2: Redis Pub/Sub**
  - [ ] Integrate Redis client.
  - [ ] Configure message broadcasting across multiple WS instances.
- [ ] **Feature 2.3: Presence & Typing Events**
  - [ ] Implement `online`/`offline` status tracking.
  - [ ] Broadcast `typing...` events with debouncing.

## Epic 3: Headless React SDK (Client Core)
**Goal:** Build the developer-facing infrastructure (npm package).

- [ ] **Feature 3.1: State Management**
  - [ ] Setup Zustand inside `packages/react-sdk`.
  - [ ] Implement Optimistic UI updates.
  - [ ] Handle offline message queues.
- [ ] **Feature 3.2: Core Hooks**
  - [ ] Create main `useChat(config)` hook.
  - [ ] Expose methods: `sendMessage`, `messages`, `typingUsers`.
- [ ] **Feature 3.3: UI Primitives**
  - [ ] Build `<ChatProvider/>`.
  - [ ] Create stylable base components: `<MessageList/>`, `<Input/>`, `<MessageBubble/>`.
  - [ ] Implement `components` prop for full UI replacement.

## Epic 4: AI Theme Generator (Killer Feature)
**Goal:** Mechanism to match chat design to client's website in 1 minute.

- [ ] **Feature 4.1: DOM Parser Engine**
  - [ ] Write script (Puppeteer/Cheerio) to parse CSS/DOM via URL.
  - [ ] Extract colors, fonts, border-radius, and shadows.
- [x] **Feature 4.2: Limited setup-token auto-tune (MVP)**
  - [x] Grant a fixed setup token budget per project (default 8000).
  - [x] Estimate tokens needed to auto-tune the product.
  - [x] One-shot auto-tune → theme tokens + welcome message.
  - [x] After tune: ongoing chat uses free_mini or MCP (not setup budget).
- [x] **Feature 4.3: Theme Injector (MVP)**
  - [x] Map theme JSON to CSS variables inside SDK components.
  - [ ] Richer DOM/CSS parser (Puppeteer/Cheerio) later.

## Epic 5: Developer Console & PLG Landing
**Goal:** Client-facing web interfaces (Marketing + Dashboard).

- [ ] **Feature 5.1: PLG Landing Page**
  - [ ] Setup Next.js + Tailwind in `apps/web`.
  - [ ] Build Hero section with "Enter your website URL" input.
  - [ ] Connect URL input to the AI Theme Generator API for live demo.
- [ ] **Feature 5.2: Developer Console**
  - [ ] Build dashboard (Auth, Projects list).
  - [ ] Implement API Key generation (Public/Secret).
  - [ ] Display basic usage statistics (MAU, Messages count).

## Epic 6: BYO Agent (Free Mini + MCP) — avoid token tariffs
**Goal:** Chat AI without forcing NativeChat into per-token plans/limits.
When a site installs the chat, heavy AI usage must not burn platform tokens.
Instead of inventing tariff tiers, let the installer pick an agent.

- [x] **Feature 6.1: Agent provider model**
  - [x] `Project.agentProvider`: `free_mini` | `mcp`
  - [x] Store MCP server URL, tool name, optional auth token server-side
  - [x] Public agent config API (no secrets leaked)
- [x] **Feature 6.2: Free GPT Mini**
  - [x] Built-in lightweight reply path (`gpt-4o-mini` when `OPENAI_API_KEY` is set)
  - [x] Demo fallback when no platform key is configured
- [x] **Feature 6.3: Custom agent via MCP**
  - [x] Minimal Streamable HTTP / JSON-RPC MCP client
  - [x] `tools/list` + `tools/call` with message payload
  - [x] Auto-pick a chat-like tool if configured name is missing
- [x] **Feature 6.4: Chat UI agent selector**
  - [x] `<AgentSelector/>` in `ChatWidget` header
  - [x] Switch Free Mini ↔ MCP, configure MCP URL/tool/token
- [x] **Feature 6.5: Setup budget → then free/MCP**
  - [x] Limited setup tokens only for product auto-tune
  - [x] Estimate endpoint before charging
  - [x] UI: SetupPanel → AgentSelector handoff
- [ ] **Feature 6.6: Hardening (later)**
  - [ ] Encrypt `mcpAuthToken` at rest
  - [ ] Per-project rate limits only as abuse protection (not monetization)
  - [ ] MCP OAuth / session refresh
