# Agent context: backend/proxy

## Purpose
Cloudflare Workers backend app built with Hono. Provides proxy endpoints for danmaku/DDP APIs, LLM integration, authentication (Better Auth), and D1-backed data storage.

## Tech stack
- Cloudflare Workers runtime
- Hono framework with Zod OpenAPI
- Drizzle ORM with D1 (SQLite)
- Better Auth for authentication
- Sentry for error monitoring

## Key areas
- `src/index.ts` — App entry point (CORS, logger, auth context, route mounting)
- `src/routes/api/` — API route handlers (DDP proxy, LLM, etc.)
- `src/middleware/` — Hono middleware (auth, rate limiting, etc.)
- `src/db/` — Drizzle schema and database utilities
- `src/auth.ts` — Better Auth configuration
- `src/factory.ts` — Hono app factory

## Scripts
| Script | Description |
|---|---|
| `pnpm dev` | Local dev server (staging env) |
| `pnpm dev:remote` | Dev with remote D1 |
| `pnpm test` | Run Vitest tests |
| `pnpm lint` | Biome lint |
| `pnpm deploy:staging` | Deploy to staging |
| `pnpm deploy:prod` | Deploy to production |
| `pnpm drizzle:generate` | Generate Drizzle migrations |
| `pnpm db:migrate:local` | Apply migrations locally |
| `pnpm db:migrate:staging` | Apply migrations to staging |
| `pnpm db:migrate:prod` | Apply migrations to production |
| `pnpm cf-typegen` | Generate Cloudflare type bindings |

## Workspace dependencies
- @danmaku-anywhere/integration-policy

## When changing
Update this file and `README.md` if you add routes, env vars, or deploy steps.
