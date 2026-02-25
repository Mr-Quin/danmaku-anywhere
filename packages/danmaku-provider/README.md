# @danmaku-anywhere/danmaku-provider

Danmaku data providers and API client configuration. Supplies danmaku from multiple backends (DDP, Bilibili, Tencent, MacCMS, Kazumi, etc.) and shared store for API base URL.

## Exports

- **`.`** — Core exports: exceptions, `configureApiStore`
- **`./ddp`**, **`./bilibili`**, **`./tencent`**, **`./maccms`**, **`./genAi`**, **`./kazumi`** — Provider-specific APIs
- **`./config`**, **`./files`** — Config and file-based providers

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm build` | Compile protobuf + tsgo |
| `pnpm protobuf:compile` | Regenerate Bilibili protobuf |
| `pnpm generate:schemas` | (OpenAPI) — use `openapi-ts` as needed |
| `pnpm test` | Vitest |

## Dependencies

- `@danmaku-anywhere/danmaku-converter`, `@danmaku-anywhere/result`, `protobufjs`, `zod`
