# Agent context: packages/danmaku-provider

- **Purpose**: Fetch danmaku from various backends (DDP, Bilibili, Tencent, MacCMS, Kazumi, etc.) and configure API base URL via `configureApiStore`.
- **Consumers**: Extension, app/web, web-scraper, backend/proxy (API routes).
- **Exports**: Main entry plus subpaths `./ddp`, `./bilibili`, `./tencent`, `./maccms`, `./genAi`, `./kazumi`, `./config`, `./files`. See package.json `exports`.
- **When changing**: Update this file and `README.md` if you add a provider, new export, or change store/API shape.
