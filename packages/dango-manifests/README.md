# @danmaku-anywhere/dango-manifests

Built-in dango manifests for the danmaku sources the extension ships with. Each manifest is a JSON file declaring the search/episodes/danmaku pipelines a [@danmaku-anywhere/dango](../dango/README.md) `ManifestRunner` interprets at runtime — no per-source TypeScript fetching code.

This package is data, not code. There is no `index.ts` — consumers import each manifest JSON directly via the `./manifests/*` subpath export.

## Shipped manifests

| Id | Endpoint | Notes |
| --- | --- | --- |
| `builtin:dandanplay` | `api.danmaku.weeblify.app/ddp/v1` (proxy) | Proxy holds DDP credentials; client carries none. |
| `builtin:ddp-compat` | User-supplied `baseUrl` (configSchema) | Template for user-added `DanDanPlayCompatible` provider configs; auth headers pass through as inputs. |
| `builtin:bilibili` | `api.bilibili.com` + `dm.video.qq.com` | Parallel media_bangumi + media_ft search; xml + protobuf danmaku variants. |
| `builtin:tencent` | `pbaccess.video.qq.com` + `dm.video.qq.com` | POST bodies, page-cursor episode pagination via forEach `breakOn`, two-phase danmaku (segment index → per-segment fetch). |

## Layout

```
src/
  manifests/
    builtin-dandanplay.json
    builtin-ddp-compat.json
    builtin-bilibili.json
    builtin-tencent.json
  __tests__/
    builtin-*.test.ts                   # per-manifest pipeline tests
    fixtures/                           # captured representative responses
scripts/
  smoke-test.ts                         # manual end-to-end test against the real backend
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

## Routing notes

**DanDanPlay** (`builtin:dandanplay`) goes through the backend proxy at `api.danmaku.weeblify.app/ddp/v1`. The proxy holds `X-AppId` / signing credentials via a Cloudflare service binding to the DDP microservice — clients carry no secret. The upstream path + query is embedded as the value of the `path` query param (e.g. `?path=/v2/search/anime?keyword=frieren`); the microservice splits that into the real upstream request.

**DanDanPlay-compatible self-hosted** (`builtin:ddp-compat`) takes `baseUrl` via `configSchema` and `authHeaders` as a per-call inputs array of `{key, value}` pairs. One manifest serves any number of user-added `DanDanPlayCompatible` provider configs; the extension passes the user's config blob into each pipeline run.

**Bilibili** and **Tencent** call their public APIs directly. Both rely on `rewriteHeaders` for `Origin` / `Referer`, which the extension's `FetchLike` applies via `chrome.declarativeNetRequest`. The smoke script merges those headers in directly since Node fetch lets you set them.

## Smoke testing

`pnpm smoke <source> [keyword]` walks search → first result → episodes → first episode → danmaku against the real backend. Not in CI; useful when adding a manifest or verifying after an upstream change.

| Source | Command | Status |
| --- | --- | --- |
| ddp | `pnpm smoke ddp Frieren` | works |
| bilibili | `pnpm smoke bilibili Naruto` | works (after a cookie warm-up via `www.bilibili.com`) |
| tencent | `pnpm smoke tencent 庆余年` | works |

The smoke fetcher keeps a per-host cookie jar so bilibili's anti-bot wall lets us through, and it merges `rewriteHeaders` into the outgoing request (Node has no `Origin`/`Referer` restriction). `ddp-compat` has no live smoke because there's no canonical self-hosted server to point at.

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
| `pnpm smoke <source>` | Live end-to-end test against the real backend (manual, **not CI**) |
| `pnpm type-check` | tsgo --noEmit |
| `pnpm lint` | tsgo + biome check --fix |
| `pnpm build` | Compile with tsgo |
