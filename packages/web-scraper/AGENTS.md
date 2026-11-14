# Agent context: packages/web-scraper

## Purpose

Scrape video/page metadata and danmaku-related data from websites.

## Gotchas

- Runs in the browser extension context, not Node.js — browser APIs only
- Private to this repo; only the extension uses it. `main` points at `dist`, so build it before the extension resolves it
- `@types/chrome` is a peer dependency because the emitted `.d.ts` references the `chrome` namespace through the `/// <reference types="chrome" preserve="true" />` in `src/utils.ts`
- See `package.json` for available scripts and dependencies
