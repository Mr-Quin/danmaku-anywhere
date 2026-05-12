# Agent context: packages/dango-manifests

## Purpose

Ships the JSON manifests that drive [@danmaku-anywhere/dango](../dango/AGENTS.md). One manifest per source. This package is data + tests + a manual live smoke; engine logic lives in dango.

## Layout

- `src/manifests/*.json` — the manifests. Filenames mirror the manifest `id` (`builtin:<source>` → `builtin-<source>.json`).
- `src/__tests__/<manifest>.test.ts` — per-manifest pipeline tests.
- `src/__tests__/fixtures/<source>-*.json` — captured representative responses. Each manifest owns its fixtures.
- `scripts/smoke-test.ts` — manual end-to-end test against the real proxy. Not in CI.

## Consumer entry point

There is no `index.ts`. Consumers import each manifest JSON directly via the package's `./manifests/*` subpath export:

```ts
import ddp from '@danmaku-anywhere/dango-manifests/manifests/builtin-dandanplay.json' with { type: 'json' }
```

Adding an aggregate index is a footgun: it forces every consumer to load every manifest even when they need one, and it makes bundlers think this package has a single runtime entry point when it actually has none.

## URL strategy

DDP-style sources are routed through the backend proxy at `api.danmaku.weeblify.app`, not direct to `api.dandanplay.net`. The proxy holds credentials via a Cloudflare service binding and unwraps `?path=<upstream-path-and-query>` to forward signed requests upstream. So `builtin:dandanplay`'s manifest looks like:

```
url:   'https://api.danmaku.weeblify.app/ddp/v1'
query: { 'path': '/v2/search/anime?' & $sortedQueryString({ 'keyword': q }) }
```

The whole upstream path + query is embedded as the **value** of the single `path` query param. `$sortedQueryString` builds a properly URL-encoded `k=v&k=v` string, which the engine then encodes again as it builds the outer request URL. The proxy decodes once and the microservice re-parses to drive the upstream request.

For sources that don't need a proxy (Bilibili, Tencent, etc.), point at the upstream host directly and list it in `hosts`.

## ddp-compat (`builtin:ddp-compat`)

The legacy provider had an `isCustom` mode that swapped the proxy URL for a user-supplied base URL pointing at a self-hosted DDP-compatible server. Under the manifest model this is a **separate manifest** with one runtime instance per user config:

- `configSchema` declares `baseUrl` (user-editable string)
- `authHeaders` is a per-call input array of `{key, value}` pairs — the extension supplies it from the stored provider config's `options.auth.headers`. Single `headers` expression on the request evaluates to `authHeaders.{key: value}` (grouping operator) which builds the dynamic header map.
- `hosts: ['*']` (wildcard, since the host comes from config)
- No proxy routing — direct calls

One template manifest serves N user-added `DanDanPlayCompatible` provider configs. The user's instance UUID and `options` live in the provider config DB and reference this manifest by id at dispatch time.

## Bilibili (`builtin:bilibili`)

Two parallel `media_bangumi` + `media_ft` calls under `search`. Episodes go through `/pgc/view/web/season`. Danmaku has two variants:

- `xml` — single call, response is XML; the manifest splits each `<d p="...">` attribute's comma-separated fields and rebuilds the canonical `time,mode,color,uid` shape.
- `protobuf` (default) — `forEach` over `$range(1, 31)` (up to 30 six-minute segments = 3 hour cap). Each iteration decodes the inline `dm.v1.DmSegMobileReply` proto carried in `protoSchemas.bili`. Bilibili returns 304 past the last segment, which the request opts into via `acceptStatus: [304]`; the engine treats the empty body as an empty payload.

Modes 2 and 3 (substyles of scroll-right) collapse to mode 1 in the canonical output; modes outside `{1,4,5,6}` are filtered out.

## Tencent (`builtin:tencent`)

POST endpoints with complex JSON bodies. Episodes pagination uses `forEach.breakOn` ("stop when this page has < 100 items"), forcing sequential iteration. Danmaku is two-phase: an `http` step hits `barrage/base/{vid}` to discover segment names, an `assign` step flattens `segment_index.*.segment_name` into an array, and a `forEach` fetches each segment in parallel.

Comment styling: `content_style` is a JSON-encoded string in the response. The manifest uses `$jsonParse` to extract the hex color, falling back to white when missing or unparseable.

## Conventions

- Manifests use **raw JSON, not pre-parsed**. Consumers wrap with `zManifest.parse()` at startup. Pre-parsing in this package would force a dango type dependency to flow through and tie shipping versions tighter than needed.
- One manifest per file.
- Manifest `id` must be `builtin:<source>` for anything shipped here.
- Tests must (1) parse against `zManifest`, (2) mock `FetchLike` with captured fixtures per pipeline, (3) assert the exact canonical output shape. Use exact URL match in the mock fetcher — silent query-string mismatches should surface as test failures.
- Fixtures are captured responses, edited only to redact noise. Keep representative shape and value types.

## Gotchas

- **URLs in manifests are JSONata expressions**, not raw strings. String literals must be wrapped in single quotes: `'https://...'`. Forgetting the quotes makes `https` look like a variable.
- **`$sortedQueryString` for proxy `path` values.** Raw concat of user input into the upstream query string breaks when the input contains `&`, `=`, or `?`. The helper URL-encodes each value.
- **JSON imports need `with { type: 'json' }`** under NodeNext module mode.
- **No engine reimplementation here.** If a test fails because of dango behavior, fix dango.

## Adding a manifest

1. Drop the JSON file in `src/manifests/`. Validate locally with `zManifest.parse()` in a scratch script if you want fast feedback.
2. Capture a fixture per pipeline to `src/__tests__/fixtures/`.
3. Add `src/__tests__/<source>.test.ts` covering all three pipelines.
4. (Optional) Extend `scripts/smoke-test.ts` so the new manifest can be exercised live.
5. Run `pnpm --filter @danmaku-anywhere/dango-manifests test`.

## Conventions (code style)

- `/** */` for multi-line; single-line `//` for one-liners.
- `function` declarations for module-level named functions; arrows for callbacks.
- No `any` — use `unknown` and narrow.
- Tests live alongside the package; vitest config only matches `src/__tests__/**/*.test.ts`.
