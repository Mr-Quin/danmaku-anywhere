# Agent context: packages/danmaku-converter

## Purpose

Parse and normalize danmaku from various formats (XML, protobuf, etc.) into a common canonical format used across the project. The canonical format (`src/canonical/`) is the shared data contract between packages.

## Gotchas

- Changes to the canonical schema affect all downstream consumers (engine, provider, extension, web app)
- Published to GitHub Packages. In-repo consumers read the top-level `main`/`types`, which point at source; the published package reads `publishConfig`, which points at `dist`. Keep both in sync, and add a changeset (`pnpm changeset`) for changes consumers will see
- See `package.json` for available scripts and dependencies
