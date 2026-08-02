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
- [ ] **Feature 4.2: LLM Processor**
  - [ ] Design system prompt for OpenAI/Claude.
  - [ ] Create endpoint to convert raw CSS data into a strict JSON design-token format.
- [ ] **Feature 4.3: Theme Injector**
  - [ ] Add theme parser to React SDK.
  - [ ] Map JSON tokens to CSS variables inside SDK components.

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
