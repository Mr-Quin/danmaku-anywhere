# Agent context: packages/web-scraper

## Purpose
Scrape video/page metadata and danmaku-related data from websites. Runs in the browser extension context.

## Key areas
- `src/kazumi/` — Kazumi rule-based scraping
- `src/messaging/` — Extension messaging for scraping requests
- `src/extractMedia.ts` — Media extraction from pages
- `src/cat-catch.ts` — Cat-Catch integration
- `src/types.ts` — Scraper type definitions
- `src/index.ts` — Public API entry point

## Scripts
| Script | Description |
|---|---|
| `pnpm build` | Build with tsgo |
| `pnpm lint` | Biome lint |
| `pnpm type-check` | TypeScript only |

## Consumers
Extension (packages/danmaku-anywhere), app/web

## Workspace dependencies
- @danmaku-anywhere/danmaku-converter
- @danmaku-anywhere/danmaku-provider

## When changing
Update this file and `README.md` if you add scraping targets or change the public API.
