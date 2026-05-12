# @danmaku-anywhere/dango-manifests

Built-in dango manifests for the danmaku sources the extension ships with. Each manifest is a JSON file declaring the search/episodes/danmaku pipelines a [@danmaku-anywhere/dango](../dango/README.md) `ManifestRunner` interprets at runtime — no per-source TypeScript fetching code.

This package is data, not code. The only TypeScript here is `src/index.ts`, which re-exports the JSON manifests as typed constants. Consumers parse them once at startup with `zManifest.parse()` from `@danmaku-anywhere/dango`.

## Layout

```
src/
  index.ts                            # exports BUILTIN_MANIFESTS map
  manifests/
    builtin-dandanplay.json           # DanDanPlay source manifest
  __tests__/
    builtin-dandanplay.test.ts        # per-manifest pipeline tests against captured fixtures
    fixtures/
      ddp-search.json
      ddp-bangumi.json
      ddp-comments.json
```

## Usage

```ts
import { ManifestRunner, zManifest } from '@danmaku-anywhere/dango'
import { BUILTIN_MANIFESTS } from '@danmaku-anywhere/dango-manifests'

const manifest = zManifest.parse(BUILTIN_MANIFESTS['builtin:dandanplay'])
const runner = new ManifestRunner(manifest, { fetcher })

const results = await runner.runSearch({ q: 'frieren' })
const episodes = await runner.runEpisodes({ bangumiId: results[0].providerIds.bangumiId })
const danmaku = await runner.runDanmaku({ episodeId: episodes[0].providerIds.episodeId })
```

## Adding a new manifest

1. Drop the JSON file in `src/manifests/`. Use `id: 'builtin:<source>'` for the id.
2. Add it to the `BUILTIN_MANIFESTS` map in `src/index.ts`.
3. Capture representative responses from the source's API to `src/__tests__/fixtures/`.
4. Write a per-manifest test that:
   - Parses the manifest against `zManifest` (catches schema drift)
   - Runs each pipeline with a mocked `FetchLike` against the captured fixtures
   - Asserts the canonical shape the engine emits

Each manifest's tests own their own fixtures — don't share fixtures across manifests.

## Trust model

Manifests in this package are vetted at PR review time and shipped with the extension. They are not user-installable. User-installed manifests are a separate, future feature with explicit consent UX. See dango's [trust model](../dango/README.md#trust-model) for the engine-level invariants that apply regardless of where a manifest comes from.

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm test` | Vitest — runs fixture-backed pipeline tests |
| `pnpm type-check` | tsgo --noEmit |
| `pnpm lint` | tsgo + biome check --fix |
| `pnpm build` | Compile with tsgo |
