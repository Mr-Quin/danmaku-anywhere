# Agent context: packages/danmaku-model

## Purpose

The shared data model. The canonical schemas in `src/canonical/` (comments, episodes, seasons, bookmarks, providers) are the data contract between packages; `src/schema/` and `src/utils/` hold XML parsing and conversion.

## Gotchas

- Changes to the canonical schema affect all downstream consumers (engine, provider, extension, web app)
- Published to GitHub Packages. In-repo consumers read the top-level `main`/`types`, which point at source; the published package reads `publishConfig`, which points at `dist`. Keep both in sync, and add a changeset (`pnpm changeset`) for changes consumers will see
- See `package.json` for available scripts and dependencies
