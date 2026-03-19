# CLAUDE.md — Agent Guide for Danmaku Anywhere

This file provides context for AI agents (Claude, Cursor, Copilot, etc.) working on this codebase.

## What is this project?

Danmaku Anywhere is an open-source project for overlaying danmaku (bullet comments) on video websites. It consists of:

- **Browser extension** (`packages/danmaku-anywhere/`) — Chrome/Firefox extension that injects danmaku onto video pages (Plex, Jellyfin, YouTube, etc.)
- **Web app** (`app/web/`) — Angular SPA for video discovery/playback using Kazumi rules, requires the extension
- **Backend** (`backend/proxy/`) — Cloudflare Workers API (Hono) for proxying, auth, and LLM features
- **Shared packages** — TypeScript libraries used across the above

## Monorepo structure

```
packages/
  danmaku-anywhere/     # Browser extension (React 19, Vite, MUI, Zustand)
  danmaku-converter/    # Parse/normalize danmaku formats (XML, etc.)
  danmaku-engine/       # Render danmaku on video containers (wraps @mr-quin/danmu)
  danmaku-provider/     # Fetch danmaku from APIs (DDP, Bilibili, Tencent, MacCMS, Kazumi)
  web-scraper/          # Scrape video/page metadata from sites
  bangumi-api/          # Typed Bangumi API schemas for openapi-fetch
  result/               # Result<T, E> type for explicit error handling
  integration-policy/   # Schema for site/feature integration policies
app/
  web/                  # Angular 21+ web app (PrimeNG, Tailwind, TanStack Query)
backend/
  proxy/                # Cloudflare Workers (Hono, Drizzle, Better Auth, D1)
docs/                   # Astro-based documentation site
```

## Quick reference

| Task | Command |
|---|---|
| Install deps | `pnpm install` |
| Build all | `pnpm build` |
| Build packages only | `pnpm build:packages` |
| Lint & fix | `pnpm lint` |
| Type check | `pnpm type-check` |
| Run all tests | `pnpm test` |
| Format | `pnpm format` |
| Dev extension | `cd packages/danmaku-anywhere && pnpm dev` |
| Dev web app | `cd app/web && pnpm start` |
| Dev backend | `cd backend/proxy && pnpm dev` |

## Tech stack by area

### Extension (`packages/danmaku-anywhere/`)
- React 19, TypeScript, Vite (via @crxjs/vite-plugin)
- MUI (Material UI) for components
- Zustand for client state, TanStack Query for server state
- React Router, React Hook Form + Zod validation
- Inversify for dependency injection (IoC)
- Dexie (IndexedDB) for local storage
- i18next for internationalization
- Content scripts + background service worker architecture

### Web App (`app/web/`)
- Angular 21+ with standalone components (no NgModules)
- PrimeNG + Tailwind CSS for UI
- TanStack Angular Query for data fetching
- Signals for state, NgRx Signals for store
- Artplayer for video playback
- Dexie for client-side storage

### Backend (`backend/proxy/`)
- Cloudflare Workers runtime
- Hono framework with Zod OpenAPI
- Drizzle ORM with D1 (SQLite)
- Better Auth for authentication
- Sentry for error monitoring

### Shared packages
- TypeScript with strict mode
- Biome for linting and formatting
- Vitest for testing

## Key patterns and conventions

### Code style
- **Formatter/linter**: Biome (not ESLint/Prettier). Config at root `biome.json`.
- **Quotes**: Single quotes, no semicolons (except where required)
- **Indentation**: 2 spaces
- **Trailing commas**: ES5 style
- **Imports**: Use `import type` for type-only imports (enforced by Biome)
- **No `any`**: Use `unknown` when type is uncertain. `any` triggers a warning.

### TypeScript
- Strict mode enabled everywhere (`tsconfig.base.json`)
- Prefer type inference when the type is obvious
- Use proper type annotations for function parameters and return types

### React (extension)
- Functional components with hooks only
- Zustand for global client state, `useState` for local state
- TanStack Query for all server/async state
- React Hook Form + Zod for form validation
- Error boundaries for error handling
- Inversify IoC container for dependency injection in `src/common/ioc/`

### Angular (web app)
- Standalone components only (no NgModules, `standalone: true` is implied)
- Use `input()`/`output()` functions, not decorators
- Use signals and `computed()` for state
- `ChangeDetectionStrategy.OnPush` always
- Native control flow (`@if`, `@for`, `@switch`), not structural directives
- `injectQuery`/`injectMutation` from TanStack Query
- `inject()` function, not constructor injection
- Reactive forms, not template-driven
- Do NOT use `ngClass`/`ngStyle` — use `class`/`style` bindings

### Backend
- Hono routes in `src/routes/api/`
- Middleware in `src/middleware/`
- Drizzle migrations for D1 schema changes
- Environment-based deployment: staging, production

### Code style (additional rules)
- **No same-line if bodies**: always use a block `{ }` on the next line, even for early returns. `if (x) return` → `if (x) { return }`
- **No bodyless one-liner arrow functions**: use an explicit block with `return` when the function has a type annotation or is non-trivial. `(x) => x.foo` is fine for simple callbacks; named/typed functions should use `{ return ... }`
- **No syntax soup**: avoid dense ternary chains, chained optional calls, or expressions that require more than one read to parse

### Error handling
- Use the `Result` type from `@danmaku-anywhere/result` for explicit error handling
- Avoid throwing exceptions for expected error paths

## Build order and dependencies

Packages must be built before apps that depend on them:

```
result, integration-policy, bangumi-api  (no internal deps)
    → danmaku-converter  (depends on result)
    → danmaku-engine  (depends on danmaku-converter)
    → danmaku-provider  (depends on converter, result)
    → web-scraper  (depends on converter, provider)
    → danmaku-anywhere (extension, depends on all above)
    → app/web  (depends on converter, provider, web-scraper, bangumi-api)
    → backend/proxy  (depends on integration-policy)
```

`pnpm build:packages` builds the library packages. `pnpm build` builds everything.

## Git hooks and CI

- **Pre-commit**: Lefthook runs Biome check on staged files (auto-fixes formatting)
- **CI (PR Quality)**: Runs type-check, lint, and test on PRs
- **PR titles**: Checked by CI workflow

## Testing

- **Packages and backend**: Vitest (`pnpm test` in each package or root)
- **Web app**: Jasmine + Karma (`pnpm test:ng` in `app/web/`)
- Run `pnpm test` at root to run all tests

## Per-package documentation

Each package/app has its own `AGENTS.md` with package-specific context. Read the relevant `AGENTS.md` when working on a specific package.

## Common pitfalls

- Always run `pnpm build:packages` before running the extension or web app in dev mode, since they import from workspace packages
- The extension uses `@crxjs/vite-plugin` which has its own HMR behavior — don't confuse with standard Vite
- The web app requires the browser extension to be installed for scraping features
- `pnpm-lock.yaml` is in `.cursorignore` — don't try to read it
- The project uses `pnpm@10.11.0` — do not use npm or yarn
