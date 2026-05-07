# PowerCode AI

A super-powered AI code writing assistant — Monaco editor, AI chat with streaming, snippet library, and conversation history.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/code-writer run dev` — run the frontend (port 18425, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Wouter routing, TanStack Query, shadcn/ui, Tailwind CSS v4
- Editor: Monaco Editor (`@monaco-editor/react`)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- AI: OpenAI (via Replit AI integration, streamed SSE)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for API contract
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas (index.ts = single export line)
- `lib/db/src/schema/` — Drizzle ORM table definitions
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/code-writer/src/pages/` — React pages (EditorPage, SnippetsPage, NewSnippetPage)
- `artifacts/code-writer/src/components/` — shared components (AppLayout, ThemeProvider)

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed hooks + Zod validators used everywhere
- SSE streaming for AI chat: manual `fetch + ReadableStream` (not generated hooks) since Orval can't model SSE
- Dark-first theme with light mode toggle; CSS custom properties with HSL values
- Conversation context: user message sent with current editor code prepended so AI has full context
- `lib/api-zod/src/index.ts` must stay as a single `export * from "./generated/api";` line — Orval regenerates it

## Product

- **Editor page** (`/`): Full Monaco code editor (20+ languages) + AI chat panel. Resizable split view. AI action buttons (Generate, Explain, Debug, Refactor, Add Comments, Write Tests, Translate, Optimize). Streaming AI responses token-by-token. Save to snippets, copy, clear.
- **Snippets** (`/snippets`): Searchable, filterable grid of saved code snippets. Favorite, copy, edit, delete. Stats bar with language breakdown.
- **New Snippet** (`/new-snippet`): Create or edit snippets with Monaco editor, title, language, description.

## User preferences

- Dark theme by default, purple accent color
- Monospace font: JetBrains Mono

## Gotchas

- After running `pnpm --filter @workspace/api-spec run codegen`, check that `lib/api-zod/src/index.ts` is still just `export * from "./generated/api";` — orval may regenerate it incorrectly
- Do NOT run `pnpm dev` at workspace root — use workflows or `pnpm --filter` commands
- SSE endpoint (`POST /api/openai/conversations/:id/messages`) must be called with manual fetch, not generated hooks
- OpenAI model: `gpt-5.4` with `max_completion_tokens: 8192`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
