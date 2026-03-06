# Agent context: packages/danmaku-anywhere

## Purpose
Chrome/Firefox browser extension that injects danmaku (bullet comments) onto video pages. This is the main user-facing product.

## Tech stack
- React 19, TypeScript, Vite (via @crxjs/vite-plugin)
- MUI (Material UI) for components
- Zustand for client state, TanStack Query for server state
- React Hook Form + Zod for form validation
- Inversify for dependency injection
- Dexie (IndexedDB) for local storage
- i18next for internationalization

## Key areas
- `src/background/` — Background service worker (persistent logic, API calls)
- `src/content/` — Content scripts injected into web pages (danmaku overlay)
- `src/popup/` — Extension popup UI
- `src/common/` — Shared code across extension contexts:
  - `ioc/` — Inversify IoC container setup
  - `danmaku/` — Danmaku management
  - `anime/` — Anime matching logic
  - `db/` — Dexie database definitions
  - `rpc/` — Communication between extension contexts
  - `ai/` — AI matching features
  - `configs/` — Extension configuration
  - `localization/` — i18n setup
- `src/assets/` — Static assets
- `src/tests/` — Test files

## Scripts
- `pnpm dev` — Dev mode (Chrome)
- `pnpm dev:firefox` — Dev mode (Firefox)
- `pnpm build` — Production build (Chrome)
- `pnpm build:firefox` — Production build (Firefox)
- `pnpm test` — Run Vitest tests
- `pnpm lint` — Type-check + Biome lint
- `pnpm type-check` — TypeScript only
- `pnpm i18n:check` — Verify i18n keys

## Workspace dependencies
- @danmaku-anywhere/danmaku-converter
- @danmaku-anywhere/danmaku-engine
- @danmaku-anywhere/danmaku-provider
- @danmaku-anywhere/integration-policy
- @danmaku-anywhere/result
- @danmaku-anywhere/web-scraper

## License
AGPL-3.0

## When changing
Update this file and `README.md` if you add scripts, major features, new workspace dependencies, or change the extension architecture.
