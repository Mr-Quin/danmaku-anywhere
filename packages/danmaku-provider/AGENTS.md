# Agent context: packages/danmaku-provider

## Purpose

Fetch danmaku from various backend APIs. Each provider is a separate subpath export (e.g., `./ddp`, `./bilibili`, `./tencent`, `./maccms`, `./kazumi`, `./config`, `./files`).

## Gotchas

- Uses subpath exports — when adding a provider, add a new export in `package.json`
- Bilibili provider uses protobuf — run `pnpm protobuf:compile` after changing `.proto` files
- See `package.json` for available scripts and dependencies
