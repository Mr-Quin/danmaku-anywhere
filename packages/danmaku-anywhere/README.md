# Danmaku Anywhere (Browser Extension)

Browser extension that adds danmaku (bullet comments) to video sites (Plex, Jellyfin, YouTube, etc.).

## Tech Stack

- React 19 + Vite
- Material-UI (MUI), React Router, TanStack Query, Zustand
- Chrome Extension (Manifest V3) and Firefox support

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm dev` | Dev server (Chrome) |
| `pnpm dev:firefox` | Dev build for Firefox |
| `pnpm build` | Production build to `build/` |
| `pnpm build:firefox` | Production build for Firefox |
| `pnpm standalone:dev` | Standalone web app dev |
| `pnpm test` | Vitest |
| `pnpm lint` | TypeScript + Biome |

## Workspace Dependencies

- `@danmaku-anywhere/danmaku-converter`, `danmaku-engine`, `danmaku-provider`
- `@danmaku-anywhere/integration-policy`, `result`, `web-scraper`

## License

AGPL-3.0
