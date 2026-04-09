# Agent context: backend/proxy

## Purpose

Cloudflare Workers backend app built with Hono. Provides proxy endpoints for danmaku/DDP APIs, LLM integration, authentication (Better Auth), and D1-backed data storage.

## Tech stack

- Cloudflare Workers runtime
- Hono framework with Zod OpenAPI
- Drizzle ORM with D1 (SQLite)
- Better Auth for authentication
- Sentry for error monitoring

## Conventions

- Routes live in `src/routes/api/`
- Middleware lives in `src/middleware/`
- Use Drizzle migrations for all D1 schema changes
- Environment-based deployment: staging, production

## Gotchas

- D1 is SQLite — not all SQL features are available
- Run `pnpm drizzle:generate` after schema changes, then apply migrations
- See `package.json` for available scripts and dependencies
