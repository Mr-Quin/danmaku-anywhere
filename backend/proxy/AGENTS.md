# Agent context: backend/proxy

- **Purpose**: Cloudflare Workers app (Hono): proxy for danmaku/DDP, LLM, auth (Better Auth), and D1-backed data.
- **Entry**: `src/index.ts` — CORS, logger, auth context, then `app.route('/', api)`.
- **Key areas**: `src/routes/api/` (DDP, LLM, etc.), `src/middleware/`, Drizzle config and migrations.
- **When changing**: Update this file and `README.md` if you add routes, env vars, or deploy steps. Follow repo rule `backend-standards.mdc`.
