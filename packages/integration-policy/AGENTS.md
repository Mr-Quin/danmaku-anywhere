# Agent context: packages/integration-policy

## Purpose
Schema and utilities for integration policies — defines which sites and features the extension or backend supports/allows.

## Key areas
- `src/schema.ts` — Policy schema definitions
- `src/utils.ts` — Policy evaluation utilities
- `src/migrations/` — Schema migration logic
- `src/index.ts` — Public API entry point

## Scripts
| Script | Description |
|---|---|
| `pnpm build` | Build with tsgo |
| `pnpm test` | Run Vitest tests |
| `pnpm lint` | Biome lint |
| `pnpm type-check` | TypeScript only |

## Consumers
Extension (packages/danmaku-anywhere), backend/proxy

## Workspace dependencies
None (leaf package)

## When changing
Update this file and `README.md` if you add policy fields, change the schema, or add migrations.
