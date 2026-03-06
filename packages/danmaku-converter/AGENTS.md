# Agent context: packages/danmaku-converter

## Purpose
Parse and normalize danmaku from various formats (XML, protobuf, etc.) into a common canonical format used across the project.

## Key areas
- `src/canonical/` — Canonical (normalized) danmaku format definitions
- `src/schema/` — Format schemas and parsers for different danmaku sources
- `src/utils/` — Conversion utilities
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
danmaku-engine, danmaku-provider, web-scraper, danmaku-anywhere (extension), app/web

## Workspace dependencies
None (leaf package)

## When changing
Update this file and `README.md` if you add formats, change the canonical schema, or modify the public API.
