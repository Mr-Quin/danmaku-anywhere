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

## Architecture

The extension runs across three isolated contexts that communicate via RPC (`src/common/rpc/`):

- **Background service worker** — persistent logic, API calls, database access
- **Content scripts** — injected into web pages, manages danmaku overlay on video elements
- **Popup** — extension popup UI for settings and manual controls

Inversify IoC container (`src/common/ioc/`) wires up dependencies across these contexts.

## Conventions

- Functional components with hooks only
- Zustand for global client state, `useState` for local state
- TanStack Query for all server/async state
- React Hook Form + Zod for form validation
- Error boundaries for error handling
- Inversify IoC container for dependency injection

## Testing conventions

- **Every test file gets a header JSDoc block** (3-6 lines) describing what the test exercises and what it asserts. Place it immediately after imports, before the first `test()`. Treat it as the spec a future reader sees first. **No narration inside the test body** — default to no comments; add one only when removing it would mislead the next reader (footguns, races, library quirks). Well-named identifiers do the WHAT.
- e2e specs live under `e2e/specs/<area>/<source>.spec.ts`. Use the `Popup` POM in `e2e/pom/` and the `applyProfile` helper in `e2e/setup/` instead of touching selectors or chrome.storage directly. Per-source mock builders live in `e2e/network/<source>.ts`.
- e2e has its own doctrine — read `e2e/AGENTS.md` before adding or modifying specs. It covers test taxonomy (unit vs package-integration vs e2e), the "user-visible signal required" rule, network strict-mode and console-error opt-outs, and what hacks to avoid.
- **Run only affected e2e locally.** The full suite takes ~40s and is for CI. During local dev, run only the spec(s) that exercise the surface you changed — e.g. `pnpm exec playwright test e2e/specs/sources/dandanplay.spec.ts` for changes to the popup search → details flow, or `e2e/specs/mount/` for danmaku-tree changes. Trust CI for the full sweep.

## Gotchas

- `@crxjs/vite-plugin` has its own HMR behavior — don't confuse with standard Vite
- Content scripts run in an isolated world — communication with the page requires messaging
- **i18n workflow**: after adding or changing translation keys in source code, run `pnpm i18n extract` in this package to regenerate the JSON files (it sorts keys and removes unused ones). Then translate any new entries in the `zh` locale file. CI validates that extracted keys match the committed JSON — commits will fail the `Validate i18n translations` check if extraction is skipped.
- See `package.json` for available scripts and dependencies
