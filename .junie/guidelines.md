# Danmaku Anywhere Development Guidelines

This document provides essential information for developers and AI agents working on the Danmaku Anywhere project.

## Build/Configuration Instructions

### Prerequisites

- Node.js (v24+)
- pnpm 10.11.0 (enforced via `packageManager` field in root package.json)

### Setup

```bash
pnpm install
pnpm build:packages   # Must build shared packages before running apps
```

### Key Scripts (root)

| Script | Description |
|---|---|
| `pnpm build` | Build everything (packages + apps) |
| `pnpm build:packages` | Build shared packages only |
| `pnpm lint` | Lint and auto-fix all packages |
| `pnpm lint:ci` | Lint check (no auto-fix, for CI) |
| `pnpm test` | Run all tests |
| `pnpm type-check` | TypeScript type checking |
| `pnpm format` | Format all packages with Biome |

### Project Structure

This is a monorepo managed with pnpm workspaces. The main directories are:

- `packages/`: Core TypeScript libraries
    - `danmaku-anywhere/`: Browser extension (React, Vite, MUI, AGPL license)
    - `danmaku-converter/`: Danmaku format conversion utilities
    - `danmaku-engine/`: Danmaku rendering engine (wraps @mr-quin/danmu)
    - `danmaku-provider/`: Danmaku API clients (DDP, Bilibili, Tencent, MacCMS, Kazumi)
    - `web-scraper/`: Web scraping utilities for video metadata
    - `bangumi-api/`: Typed Bangumi API schemas (openapi-fetch)
    - `result/`: Result<T, E> type for explicit error handling
    - `integration-policy/`: Site/feature integration policy schema
- `app/web/`: Angular web application
- `backend/proxy/`: Cloudflare Workers backend (Hono)
- `docs/`: Astro-based documentation site

## Tooling

- **Linter/formatter**: Biome (not ESLint/Prettier). Config at root `biome.json`.
- **Package manager**: pnpm 10 with workspaces. Do NOT use npm or yarn.
- **Git hooks**: Lefthook — pre-commit runs Biome check on staged files
- **Testing**: Vitest (packages/backend), Jasmine+Karma (Angular web app)
- **CI**: GitHub Actions — type-check, lint, test on PRs

## TypeScript

- Strict mode enabled everywhere (`tsconfig.base.json`)
- Prefer type inference when the type is obvious
- Avoid `any`; use `unknown` when type is uncertain
- Use `import type` for type-only imports (enforced by Biome)

## React (packages/danmaku-anywhere/)

- Functional components with hooks only
- MUI for UI components
- React Router for routing
- TanStack Query for server state
- Zustand for client state management
- React Hook Form + Zod for form validation
- Inversify for dependency injection (`src/common/ioc/`)
- i18next for internationalization
- Dexie (IndexedDB) for local storage

## Angular (app/web/)

### Component standards
- Standalone components only (no NgModules, `standalone: true` is implied by default)
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush`
- Prefer inline templates for small components
- Use Reactive forms, not Template-driven forms
- Use `NgOptimizedImage` for static images
- Implement lazy loading for feature routes

### UI and styling
- PrimeNG for UI components
- Tailwind CSS for styling
- Do NOT use `ngClass` or `ngStyle` — use `class` and `style` bindings

### State and data
- Use signals for local component state
- Use `computed()` for derived state
- Use `injectQuery`/`injectMutation` from @tanstack/angular-query-experimental
- Use `inject()` function, not constructor injection
- Use `providedIn: 'root'` for singleton services
- Keep state transformations pure and predictable

### Templates
- Use native control flow (`@if`, `@for`, `@switch`), not `*ngIf`/`*ngFor`/`*ngSwitch`
- Use the async pipe for observables
- Keep templates simple, avoid complex logic

## Backend (backend/proxy/)

- Cloudflare Workers with Hono framework
- Drizzle ORM with D1 (SQLite) for data
- Better Auth for authentication
- Zod for request/response validation
- Environment-based deployment (staging/production via Wrangler)

## Error Handling

- Use the `Result` type from `@danmaku-anywhere/result` for explicit error handling across packages
- Avoid throwing exceptions for expected error paths
