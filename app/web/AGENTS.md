# Agent context: app/web

## Purpose
Angular SPA for video discovery and playback using Kazumi rules. Requires the Danmaku Anywhere browser extension for scraping and danmaku features.

## Tech stack
- Angular 21+ with standalone components
- PrimeNG + Tailwind CSS for UI
- TanStack Angular Query for data fetching
- Signals + NgRx Signals for state management
- Artplayer for video playback
- Dexie for client-side storage
- openapi-fetch for Bangumi API

## Key areas
- `src/main.ts` — App bootstrap, calls `configureApiStore` with `environment.apiRoot`
- `src/app/features/` — Feature modules (bangumi, player, etc.)
- `src/app/core/` — Core services (extension communication, tracking, update)
- `src/app/shared/` — Shared components, query client, UI utilities
- `src/app/layout/` — App layout components
- `src/app/app.routes.ts` — Route definitions
- `src/app/app.config.ts` — App configuration

## Scripts
| Script | Description |
|---|---|
| `pnpm start` | Dev server with HMR |
| `pnpm build` | Production build |
| `pnpm test:ng` | Run Jasmine+Karma tests |
| `pnpm lint` | Biome lint |
| `pnpm type-check` | TypeScript type check (tsgo) |

## Workspace dependencies
- @danmaku-anywhere/bangumi-api
- @danmaku-anywhere/danmaku-converter
- @danmaku-anywhere/danmaku-provider
- @danmaku-anywhere/web-scraper

## Angular conventions
See `.cursor/rules/angular-standards.mdc` and `.junie/guidelines.md` for Angular best practices. Key rules:
- Standalone components only, `standalone: true` is implied
- Use `input()`/`output()` functions, not decorators
- Use signals and `computed()` for state
- `ChangeDetectionStrategy.OnPush` always
- Native control flow (`@if`, `@for`, `@switch`)
- No `ngClass`/`ngStyle` — use `class`/`style` bindings
- Reactive forms, not template-driven
- `inject()` function, not constructor injection

## When changing
Update this file and `README.md` if you add features, new workspace deps, or change entry/configuration.
