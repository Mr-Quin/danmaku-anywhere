# Agent context: packages/web-scraper

## Purpose

Scrape video/page metadata and danmaku-related data from websites.

## Gotchas

- Runs in the browser extension context, not Node.js — browser APIs only
- Published to GitHub Packages from `dist` (the in-repo `main` already points at `dist`, so build before consumers resolve it). Add a changeset (`pnpm changeset`) for changes consumers will see
- `@types/chrome` is a peer dependency because the emitted `.d.ts` references the `chrome` namespace through the `/// <reference types="chrome" preserve="true" />` in `src/utils.ts`
- See `package.json` for available scripts and dependencies
