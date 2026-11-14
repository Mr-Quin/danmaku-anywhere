# @danmaku-anywhere/web-scraper

Scraping utilities intended to run in the browser extension context (content/background) to extract metadata and danmaku-related data from pages.

## Usage

Used by the extension. The message types it shares with the web app live in `extension-protocol`.

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm build` | Compile with tsgo |
| `pnpm lint` | Biome |
| `pnpm type-check` | TypeScript |

## Dependencies

- `@danmaku-anywhere/extension-protocol`, `async-mutex`
