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

## ddp-compat (planned, separate manifest)

The legacy provider had an `isCustom` mode that swapped the proxy URL for a user-supplied base URL pointing at a self-hosted DDP-compatible server. Under the manifest model this becomes a **separate manifest** (`builtin:ddp-compat`), not a flag on `builtin:dandanplay`:

- `configSchema` declares a user-supplied `baseUrl` field
- URL templates reference it via JSONata: `url: configSchema.baseUrl & '/v2/search/anime'`
- `hosts: ['*']` (wildcard, since the host comes from config — the engine already supports this)
- No proxy routing — direct calls

The engine pattern is exercised in [`packages/dango/src/__tests__/rewriteHeaders.test.ts`](../dango/src/__tests__/rewriteHeaders.test.ts) ("supports config-templated rewrite values (DDP-Compat use case)"). It's not in this package yet.

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
