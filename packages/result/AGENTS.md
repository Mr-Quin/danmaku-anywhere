# Agent context: packages/result

## Purpose

Result<T, E> type for explicit, type-safe error handling across packages. Similar to neverthrow.

## Gotchas

- Published to GitHub Packages. In-repo consumers read the top-level `main`/`types`, which point at source; the published package reads `publishConfig`, which points at `dist`. Keep both in sync, and add a changeset (`pnpm changeset`) for changes consumers will see
- See `package.json` for available scripts and dependencies
