# @danmaku-anywhere/web-scraper

Scraping utilities intended to run in the browser extension context (content/background) to extract metadata and danmaku-related data from pages.

## Usage

Used by the extension and the Angular web app (with extension present). Depends on `danmaku-converter` and `danmaku-provider`.

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm build` | Compile with tsgo |
| `pnpm lint` | Biome |
| `pnpm type-check` | TypeScript |

## Dependencies

- `@danmaku-anywhere/danmaku-converter`, `@danmaku-anywhere/danmaku-provider`, `zod`, `core-js`

See repo rule `web-scraping-standards.mdc` for scraping guidelines.
