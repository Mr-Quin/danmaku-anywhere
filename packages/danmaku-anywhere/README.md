# Danmaku Anywhere Extension (Standalone UI)

## Standalone Builds (Static)

This package can build standalone pages for the popup and controller UIs.
These use mock RPC data and do not require extension APIs.

### Build

```
pnpm --filter danmaku-anywhere standalone:build
```

Output directory: `packages/danmaku-anywhere/dev/standalone`

Generated entry points:
- `/popup/`
- `/controller/`

### Dev Server

```
pnpm --filter danmaku-anywhere standalone:dev
```

### Serve Build

```
pnpm --filter danmaku-anywhere standalone:serve
```

### Notes

- Standalone mode uses `vite.standalone.config.ts`, which sets `import.meta.env.VITE_STANDALONE`.
- Mock RPC handlers live in `src/common/rpcClient/mock/previewHandlers.ts` and can be extended with richer fixtures.
