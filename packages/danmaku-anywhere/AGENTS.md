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

## Gotchas

- `@crxjs/vite-plugin` has its own HMR behavior — don't confuse with standard Vite
- Content scripts run in an isolated world — communication with the page requires messaging
- See `package.json` for available scripts and dependencies
