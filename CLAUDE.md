# CLAUDE.md — Agent Guide for Danmaku Anywhere

This file provides context for Claude and Cursor working on this codebase.

## What is this project?

Danmaku Anywhere is an open-source project for overlaying danmaku (bullet comments) on video websites. It consists of:

- **Browser extension** (`packages/danmaku-anywhere/`) — Chrome/Firefox extension that injects danmaku onto video pages (Plex, Jellyfin, YouTube, etc.)
- **Web app** (`app/web/`) — Angular SPA for video discovery/playback using Kazumi rules, requires the extension
- **Backend** (`backend/proxy/`) — Cloudflare Workers API (Hono) for proxying, auth, and LLM features
- **Shared packages** — TypeScript libraries used across the above

## Monorepo structure

```
packages/
  danmaku-anywhere/     # Browser extension
  danmaku-converter/    # Parse/normalize danmaku formats
  danmaku-engine/       # Render danmaku on video containers
  danmaku-provider/     # Fetch danmaku from APIs
  web-scraper/          # Scrape video/page metadata from sites
  bangumi-api/          # Typed Bangumi API schemas
  result/               # Result<T, E> type for error handling
  integration-policy/   # Schema for site/feature integration policies
app/
  web/                  # Angular web app
backend/
  proxy/                # Cloudflare Workers backend
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
| Extract i18n keys | `cd packages/danmaku-anywhere && pnpm i18n extract` |

Always prefer scripts defined in `package.json` over ad-hoc commands. Run `pnpm type-check` instead of `tsc`/`tsgo`, `pnpm lint` instead of `biome check`, etc. When you need to run a CLI tool not available as a script, use `pnpx` (never `npx`).

## Testing strategy

- **Run affected tests only**: `pnpm --filter '...[origin/master]' test` to test only packages changed since master
- **Single package**: `pnpm --filter <package> test`
- **All tests**: `pnpm test` at root
- Packages and backend use Vitest. The web app uses Jasmine+Karma (`pnpm test:ng` in `app/web/`).
- Always run `pnpm type-check` and `pnpm lint` — these are fast and catch most issues.

## Code style

- **Formatter/linter**: Biome (not ESLint/Prettier). Config at root `biome.json`.
- **Quotes**: Single quotes, no semicolons (except where required)
- **Indentation**: 2 spaces
- **Trailing commas**: ES5 style
- **Imports**: Use `import type` for type-only imports (enforced by Biome)
- **No `any`**: Use `unknown` when type is uncertain. `any` triggers a warning.
- **No same-line if bodies**: always use a block `{ }` on the next line, even for early returns. `if (x) return` → `if (x) { return }`
- **Prefer `function` declarations**: use `function` declarations over `const` arrow functions for named/exported functions. Arrow functions are fine for callbacks and inline expressions.
- **No bodyless one-liner arrow functions**: use an explicit block with `return` when the function has a type annotation or is non-trivial. `(x) => x.foo` is fine for simple callbacks; named/typed functions should use `{ return ... }`
- **No syntax soup**: avoid dense ternary chains, chained optional calls, or expressions that require more than one read to parse
- **Decouple business logic**: keep logic decoupled from UI frameworks for testability — single source of truth over scattered state
- **No sectional comments**: sectional comments in a class are a code smell — split the class instead

## TypeScript

- Strict mode enabled everywhere (`tsconfig.base.json`)
- Prefer type inference when the type is obvious
- Use proper type annotations for function parameters and return types
- Prefer string union types over TypeScript enums
- Minimize type assertions (`as`) — only use when truly necessary

## Error handling

- Use the `Result` type from `@danmaku-anywhere/result` for explicit error handling
- Avoid throwing exceptions for expected error paths

## Refactoring guidelines

- Use TDD when refactoring — write tests first, start with reusable primitives
- Step back and think holistically before refactoring — don't anchor to the current implementation

## Per-package context

Each package/app has its own `AGENTS.md` with package-specific conventions and gotchas. Read the relevant `AGENTS.md` when working on a specific package. See `package.json` in each package for available scripts and dependencies.

Keep `AGENTS.md` files updated when adding conventions or gotchas that are specific to that package.

## Pre-commit hooks

Lefthook runs Biome check on staged files before each commit (auto-fixes formatting). If a commit fails, check the Biome output.

## Common pitfalls

- Always run `pnpm build:packages` before running the extension or web app in dev mode, since they import from workspace packages
- The extension uses `@crxjs/vite-plugin` which has its own HMR behavior — don't confuse with standard Vite
- The web app requires the browser extension to be installed for scraping features
- `pnpm-lock.yaml` is in `.cursorignore` — don't try to read it
- The project uses `pnpm@10.11.0` — do not use npm or yarn
