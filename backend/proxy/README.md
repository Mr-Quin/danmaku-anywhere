# @danmaku-anywhere/proxy

Cloudflare Workers backend: API proxy, auth, DDP/danmaku routes, LLM, and D1 DB.

## Tech Stack

- Hono, Wrangler, Cloudflare Workers
- D1 (SQLite), Drizzle ORM
- Better Auth, Sentry, Zod

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm dev` | Local dev (staging env) |
| `pnpm dev:remote` | Remote dev |
| `pnpm test` | Vitest (pool workers) |
| `pnpm deploy:staging` | Deploy staging |
| `pnpm deploy:prod` | Deploy production |
| `pnpm db:migrate:local` | Apply D1 migrations locally (staging) |
| `pnpm drizzle:generate` | Generate Drizzle migrations |

See repo rule `backend-standards.mdc` for conventions.
