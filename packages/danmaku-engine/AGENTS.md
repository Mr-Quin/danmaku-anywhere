# Agent context: packages/danmaku-engine

## Purpose
Renders danmaku on a video container. Wraps and converts data for the `@mr-quin/danmu` rendering library.

## Key areas
- `src/DanmakuRenderer.ts` — Main renderer class
- `src/options.ts` — Rendering options/configuration
- `src/parser.ts` — Danmaku data parsing for the renderer
- `src/iterator.ts` — Iteration utilities for danmaku data
- `src/plugins/` — Renderer plugins
- `src/index.ts` — Public API entry point

## Scripts
| Script | Description |
|---|---|
| `pnpm build` | Build with tsgo |
| `pnpm test` | Run Vitest tests |
| `pnpm dev` | Watch mode build |
| `pnpm lint` | Type-check + Biome lint |
| `pnpm type-check` | TypeScript only |

## Consumers
Extension (packages/danmaku-anywhere)

## Workspace dependencies
- @danmaku-anywhere/danmaku-converter

## When changing
Update this file and `README.md` if you change the rendering API, add options, or modify the plugin system.
