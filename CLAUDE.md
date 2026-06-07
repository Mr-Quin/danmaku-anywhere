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
- **No syntax soup**: avoid dense ternary chains, chained optional calls, or expressions that require more than one read to parse. Banned patterns include:
  - Spread + conditional spread in object literals (e.g. `{ ...base, ...(cond && { foo, bar }) }`) — use a ternary returning the whole object, or assign to a named variable first
  - Inline boolean-and shortcuts as element children for non-trivial branches — use a ternary or extract a render function
  - Nested ternaries beyond one level — flatten with early returns, a lookup, or an if/else cascade
- **Decouple business logic**: keep logic decoupled from UI frameworks for testability — single source of truth over scattered state
- **No sectional comments**: sectional comments in a class are a code smell — split the class instead
- **Test header comment (e2e only)**: every e2e spec under `packages/danmaku-anywhere/e2e/` has a 3-6 line JSDoc block immediately after imports describing what the test exercises and what it asserts, before the first `test()`/`describe()` call. Unit and integration tests do not require this header.

## Comments

- Default to no comments. Add one only when the **what** or **why** is non-obvious from the code itself — a hidden constraint, a subtle invariant, a workaround, behavior that would surprise a future reader.
- **Tests get a header.** The standing exception to "default to no comments": e2e specs carry a short header block (see the e2e test-header rule under Code style). The rest of these rules still apply inside that header and inside tests.
- **No narration.** Don't restate what the next few lines do. Well-named identifiers carry that load.
- **No conversation summaries.** Comments are not changelogs, review-response notes, or rationalizations for a decision someone questioned. Those belong in commit messages and PR descriptions.
- **Don't reference invisible-from-code context.** No `// Added for DA-XXX`, `// Per Gemini review`, `// As discussed`, `// Phase 2 fix`, `// Previously…`. If a future reader can't see it in the tree, the comment is dead weight.
- **Never put a ClickUp task id (`DA-XXX`) anywhere in source or comments** — not in a file or test header, not in a `for DA-XXX` note, not in a string. Task ids live only in commit messages, PR bodies, and ClickUp. This applies to all code, not just comments.
- **No defensive comments.** If you're tempted to justify code that looks reasonable on its own, delete the comment. If the code looks unreasonable, fix the code.
- **Terse, not essays.** Two or three lines is fine when the constraint genuinely needs them; a paragraph-long block comment is almost always wrong. If you find yourself writing one, ask whether the code itself should be restructured to make the constraint obvious instead.
- **Plain and approachable.** When a comment earns its place, write it so someone new to the file follows it on the first read: full words, a natural sentence, the kind of explanation you'd give a teammate. Skip insider jargon, cryptic abbreviations, and shorthand that only parses if you already know the backstory.
- **No em dashes (`—`, U+2014) anywhere new** — not in code, not in comments, not in commit messages, not in PR bodies, not in localization strings. Use a period, a comma, a colon, or parentheses instead. This applies to every locale: zh translations should not use `—` either. Existing em dashes in code/docs predate this rule; do not add new ones.

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
