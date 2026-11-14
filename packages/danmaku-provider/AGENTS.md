# Agent context: packages/danmaku-provider

## Purpose

Fetch danmaku from various backend APIs. Each provider is a separate subpath export (e.g., `./ddp`, `./bilibili`, `./tencent`, `./maccms`, `./config`, `./files`).

## Gotchas

- Uses subpath exports. When adding a provider, add the subpath to `exports` in `package.json`
- Private to this repo; only the extension uses it. The top-level `main`/`exports` point at source
- The generated `src/protobuf/protobuf.{js,d.ts}` is not emitted by `tsgo`; `build` copies it into `dist`
- Bilibili provider uses protobuf — run `pnpm protobuf:compile` after changing `.proto` files
- See `package.json` for available scripts and dependencies
