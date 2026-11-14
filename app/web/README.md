# Danmaku Somewhere (Web App)

Angular web application for Danmaku Anywhere. Provides a Kazumi-style video aggregation experience in the browser.

**Requires the [Danmaku Anywhere](https://github.com/Danmaku-Anywhere/danmaku-anywhere) browser extension to function.**

## Tech Stack

- Angular 21+ with standalone components
- PrimeNG + Tailwind CSS
- TanStack Query (Angular), RxJS, NgRx Signals
- Artplayer for video playback

## Scripts

| Command     | Description              |
| ----------- | ------------------------ |
| `pnpm start` | Dev server with HMR      |
| `pnpm build` | Production build         |
| `pnpm test:ng` | Run unit tests (Karma)  |
| `pnpm lint` | Biome check and fix      |

## Workspace Dependencies

- `@danmaku-anywhere/bangumi-api` — Bangumi API types
- `@danmaku-anywhere/danmaku-converter` — Danmaku format conversion
- `@danmaku-anywhere/extension-protocol`: messages exchanged with the extension

The backend base URL is `environment.apiRoot`. The Kazumi rule list and rule files are fetched from it by `features/kazumi/services/kazumi-api.ts`.
