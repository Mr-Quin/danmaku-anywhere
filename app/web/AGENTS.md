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

## Conventions

- Standalone components only (no NgModules, `standalone: true` is implied)
- Use `input()`/`output()` functions, not decorators
- Use signals and `computed()` for state
- `ChangeDetectionStrategy.OnPush` always
- Native control flow (`@if`, `@for`, `@switch`), not structural directives
- `injectQuery`/`injectMutation` from TanStack Query
- `inject()` function, not constructor injection
- Reactive forms, not template-driven
- Do NOT use `ngClass`/`ngStyle` — use `class`/`style` bindings
- Use `providedIn: 'root'` for singleton services

## Gotchas

- Requires the browser extension to be installed for scraping features
- Uses Jasmine+Karma for tests (`pnpm test:ng`), not Vitest
- See `package.json` for available scripts and dependencies
