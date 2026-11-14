# Agent context: packages/danmaku-provider

## Purpose

Fetch danmaku from various backend APIs. Each provider is a separate subpath export (e.g., `./ddp`, `./bilibili`, `./tencent`, `./maccms`, `./config`, `./files`).

## Gotchas

- Uses subpath exports. When adding a provider, add the subpath to both `exports` (source paths) and `publishConfig.exports` (`dist` paths) in `package.json`
- Published to GitHub Packages. In-repo consumers read the top-level `main`/`exports`, which point at source; the published package reads `publishConfig`. Add a changeset (`pnpm changeset`) for changes consumers will see
- The generated `src/protobuf/protobuf.{js,d.ts}` is not emitted by `tsgo`; `build` copies it into `dist`
- Bilibili provider uses protobuf — run `pnpm protobuf:compile` after changing `.proto` files
- See `package.json` for available scripts and dependencies
