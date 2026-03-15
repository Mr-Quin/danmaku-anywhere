# Agent context: packages/danmaku-provider

## Purpose
Fetch danmaku from various backend APIs and configure API base URLs. Each provider is a separate subpath export.

## Key areas
- `src/providers/` — One directory per provider:
  - `ddp/` — DanDanPlay API
  - `bilibili/` — Bilibili API
  - `tencent/` — Tencent Video API
  - `macCms/` — MacCMS (Vod) API
  - `genAi/` — Generative AI provider
  - `kazumi/` — Kazumi rules provider
  - `config/` — API configuration (base URL store)
  - `files/` — Local file provider
- `src/protobuf/` — Protobuf definitions (Bilibili)
- `src/shared/` — Shared provider utilities
- `src/exceptions/` — Provider error types

## Exports (subpath)
`.`, `./ddp`, `./bilibili`, `./tencent`, `./maccms`, `./genAi`, `./kazumi`, `./config`, `./files`

## Scripts
| Script | Description |
|---|---|
| `pnpm build` | Compile protobuf + build with tsgo |
| `pnpm test` | Run Vitest tests |
| `pnpm dev` | Watch mode build |
| `pnpm lint` | Type-check + Biome lint |
| `pnpm protobuf:compile` | Regenerate protobuf JS/TS from .proto |
| `pnpm openapi-ts` | Regenerate OpenAPI types |

## Consumers
Extension, app/web, web-scraper, backend/proxy

## Workspace dependencies
- @danmaku-anywhere/danmaku-converter
- @danmaku-anywhere/result

## When changing
Update this file and `README.md` if you add a provider, add a new export subpath, or change the API store shape.
