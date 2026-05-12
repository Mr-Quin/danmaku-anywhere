# @danmaku-anywhere/dango-manifests

Built-in dango manifests for the danmaku sources the extension ships with. Each manifest is a JSON file declaring the search/episodes/danmaku pipelines a [@danmaku-anywhere/dango](../dango/README.md) `ManifestRunner` interprets at runtime — no per-source TypeScript fetching code.

This package is data, not code. There is no `index.ts` — consumers import each manifest JSON directly via the `./manifests/*` subpath export.

## Layout

```
src/
  manifests/
    builtin-dandanplay.json           # DanDanPlay source manifest
  __tests__/
    builtin-dandanplay.test.ts        # per-manifest pipeline tests against captured fixtures
    fixtures/
      ddp-search.json
      ddp-bangumi.json
      ddp-comments.json
scripts/
  smoke-test.ts                       # manual live smoke against the production proxy
```

## Usage

```ts
import { ManifestRunner, zManifest } from '@danmaku-anywhere/dango'
import builtinDandanplay from '@danmaku-anywhere/dango-manifests/manifests/builtin-dandanplay.json' with { type: 'json' }

const manifest = zManifest.parse(builtinDandanplay)
const runner = new ManifestRunner(manifest, { fetcher })

const results = await runner.runSearch({ q: 'frieren' })
const episodes = await runner.runEpisodes({ bangumiId: results[0].providerIds.bangumiId })
const danmaku = await runner.runDanmaku({ episodeId: episodes[0].providerIds.episodeId })
```

## DanDanPlay routing

`builtin:dandanplay` points at the backend proxy at `api.danmaku.weeblify.app/ddp/v1`. The proxy holds the DDP `X-AppId` / signing credentials on the server side via a Cloudflare service binding to the DDP microservice — clients carry no secret. The upstream path + query is embedded as the value of the `path` query param (e.g. `?path=/v2/search/anime?keyword=frieren`); the microservice splits that into the upstream request.

A separate `builtin:ddp-compat` manifest is planned for self-hosted DDP-compatible servers — same pipeline shape, but with `configSchema` declaring a user-supplied `baseUrl` so the URL templates can be parameterized per installation. That manifest is not in this package yet.

## Adding a new manifest

1. Drop the JSON file in `src/manifests/`. Use `id: 'builtin:<source>'`.
2. Capture representative responses from the source's API to `src/__tests__/fixtures/`.
3. Write a per-manifest test that:
   - Parses the manifest against `zManifest` (catches schema drift)
   - Runs each pipeline with a mocked `FetchLike` against the captured fixtures
   - Asserts the canonical shape the engine emits
4. (Optional) Add a section to `scripts/smoke-test.ts` to exercise the new manifest against a live endpoint.

Each manifest's tests own their own fixtures — don't share fixtures across manifests.

## Trust model

Manifests in this package are vetted at PR review time and shipped with the extension. They are not user-installable. User-installed manifests are a separate, future feature with explicit consent UX. See dango's [trust model](../dango/README.md#trust-model) for the engine-level invariants that apply regardless of where a manifest comes from.

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm test` | Vitest — fixture-backed pipeline tests |
| `pnpm smoke` | Live end-to-end test against `api.danmaku.weeblify.app` (manual, **not CI**) |
| `pnpm type-check` | tsgo --noEmit |
| `pnpm lint` | tsgo + biome check --fix |
| `pnpm build` | Compile with tsgo |

`pnpm smoke [keyword]` walks search → first result → episodes → first episode → danmaku against the real proxy. The proxy holds the DDP credentials; no secrets needed locally.
