# @danmaku-anywhere/bangumi-api

TypeScript types and OpenAPI-derived schemas for the Bangumi API (current and next API).

## Exports

- **`.`** — Schema for current Bangumi API (`dist/schema.d.ts`)
- **`./next`** — Schema for next API (`dist/schema-next.d.ts`)

Use with `openapi-fetch` (peer dependency). No runtime code; types only after build.

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm build` | tsgo + copy schemas |
| `pnpm generate:schemas` | Regenerate from OpenAPI (current + next BGM API) |

## Peer dependency

- `openapi-fetch` ^0.14.0
