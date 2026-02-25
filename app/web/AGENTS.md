# Agent context: app/web

- **Purpose**: Angular SPA for video discovery and playback using Kazumi rules; depends on the extension for scraping and danmaku.
- **Entry**: `src/main.ts` bootstraps the app and calls `configureApiStore` with `environment.apiRoot`.
- **Key areas**: `src/app/features/` (bangumi, player, etc.), `src/app/core/` (extension, tracking, update), `src/app/shared/` (query client, UI).
- **Stack**: Angular 21, PrimeNG, TanStack Angular Query, Artplayer, Dexie. See repo rules `project-overview.mdc` and `angular-standards.mdc`.
- **When changing**: Update this file and `README.md` if you add features, new workspace deps, or change entry/configuration.
