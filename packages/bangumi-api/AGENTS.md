# Agent context: packages/bangumi-api

## Purpose
Typed Bangumi API schemas (current and next versions) for use with openapi-fetch. No runtime code — build outputs type definitions only.

## Key areas
- `src/schema.d.ts` — Current Bangumi API schema types
- `src/schema-next.d.ts` — Next (beta) Bangumi API schema types

## Exports (subpath)
- `.` — Current API schema
- `./next` — Next API schema

## Scripts
| Script | Description |
|---|---|
| `pnpm build` | Build with tsgo + copy schemas |
| `pnpm generate:schemas` | Regenerate schemas from upstream OpenAPI specs |
| `pnpm lint` | Biome lint |
| `pnpm type-check` | TypeScript only |

## Consumers
app/web (Bangumi features)

## Workspace dependencies
None (leaf package)

## When changing
Update this file and `README.md` if you add exports or change the generation steps. Run `pnpm generate:schemas` when upstream OpenAPI specs change.
