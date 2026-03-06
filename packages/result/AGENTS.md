# Agent context: packages/result

## Purpose
Result<T, E> type (similar to neverthrow) for explicit, type-safe error handling across packages. Avoids throwing exceptions for expected error paths.

## Key areas
- `src/result.ts` — Result type implementation (Ok, Err, match, map, etc.)
- `src/index.ts` — Public API entry point

## Scripts
| Script | Description |
|---|---|
| `pnpm build` | Build with tsgo |
| `pnpm lint` | Biome lint |
| `pnpm type-check` | TypeScript only |

## Consumers
danmaku-provider, danmaku-anywhere (extension), and others needing typed Result returns

## Workspace dependencies
None (leaf package)

## When changing
Update this file and `README.md` if you change the public API or add helpers.
