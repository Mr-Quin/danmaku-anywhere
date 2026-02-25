# Agent context: packages/bangumi-api

- **Purpose**: Typed Bangumi API schemas (current and next) for use with openapi-fetch.
- **Consumers**: app/web (Bangumi features).
- **No runtime code**: build outputs type definitions; regenerate with `pnpm generate:schemas` when upstream OpenAPI changes.
- **When changing**: Update this file and `README.md` if you add exports or change generation steps.
