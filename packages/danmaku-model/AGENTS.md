# Agent context: packages/danmaku-model

## Purpose

The shared data model. The canonical schemas in `src/canonical/` (comments, episodes, seasons, bookmarks, providers) are the data contract between packages; `src/schema/` and `src/utils/` hold XML parsing and conversion.

## Gotchas

- Changes to the canonical schema affect all downstream consumers (engine, provider, extension, web app)
- Published, so the web app can install it from outside this repo. In this repo `main`/`types` point at `src/index.ts`; the published package gets `dist` through `publishConfig`. Run `pnpm pack` and check the packed `package.json` after changing either. Add a changeset (`pnpm changeset`) for changes consumers will see
- `zod` is a peer dependency because the exported schemas are zod objects, so it has to resolve to the same copy the consumer uses
- See `package.json` for available scripts and dependencies
