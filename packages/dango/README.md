# @danmaku-anywhere/dango

Declarative engine for fetching danmaku from arbitrary sources. Each source is described by a JSON manifest the engine interprets — no per-source TypeScript needed. The extension uses dango to talk to DanDanPlay, Bilibili, Tencent, and user-installed servers without shipping fetch code per source.

A dango is a stack of items on a skewer. Each source is a stack of pipeline steps that produce one of three outputs: search results, an episode list, or danmaku comments.

## What it is

- **Schema** ([`src/manifest/schema.ts`](src/manifest/schema.ts)) — zod definitions for manifests. A manifest has `apiVersion`, `id`, `name`, `hosts`, optional `configSchema`/`urlMatch`/`protoSchemas`, and three pipelines: `search`, `episodes`, `danmaku`.
- **Pipelines** — a list of named steps + a final JSONata `output` expression. Three step types:
  - `http` — one request, with optional response extraction
  - `assign` — pure transform over the current context
  - `forEach` — iterate over a JSONata-computed array, with `concurrency` and `throttleMs` controls
- **Expressions** — every templatable value (URL, query, body, header, extract, output, etc.) is a [JSONata 2](https://jsonata.org) expression evaluated against the pipeline context. A closed helper namespace (`$md5`, `$base64Encode`, `$regexExtract`, `$permute`, etc.) provides primitives; manifests cannot register new helpers at runtime.
- **Variants** — a pipeline may declare a list of `{ when, steps, output }` branches; the first whose `when` matches the inputs wins. Used for sources with config-driven fetch paths (e.g. Bilibili's XML vs protobuf danmaku).
- **Wire-level header rewrites** — `rewriteHeaders` is the engine's escape hatch for Origin/Referer/User-Agent overrides. The engine passes them to the host's `FetchLike`; in the extension, the fetcher wraps in `chrome.declarativeNetRequest` via the existing `runWithDnr` pattern.
- **Protobuf** — `format: 'proto'` requests pull bytes from the upstream and decode using an inline `.proto` schema carried in the manifest's `protoSchemas` field.

## What lives here vs the extension

This package is library-shippable: no `chrome.*`, `window.*`, or DOM APIs in engine code. The default `FetchLike` uses global `fetch`. A Node service could embed dango with no changes (modulo browser-only features like cookie-attached requests, which the library doesn't assume exist).

The extension provides:
- A `FetchLike` implementation that wraps `runWithDnr` when `rewriteHeaders` is present
- Per-item zod validation against canonical Season/Episode/CommentEntity schemas at ingestion
- Storage layer (Dexie) that writes records keyed by `providerConfigId`
- Renderer that reads stored records and applies display transforms (group/dedup/sample/like-icon rendering)

Dango stops at "manifest in, raw items out."

## Public API

```ts
import { ManifestRunner, zManifest } from '@danmaku-anywhere/dango'

const manifest = zManifest.parse(manifestJson)
const runner = new ManifestRunner(manifest, { fetcher: extensionFetcher })
const seasons = await runner.runSearch({ q: 'frieren' })
const episodes = await runner.runEpisodes({ seasonId: 123 })
const danmaku = await runner.runDanmaku({ cid: 456 })
```

Lower-level entry points:
- `runPipeline(manifest, variants, inputs, options)` — direct pipeline execution
- `JsonataEvaluator` — bounded expression evaluator (per-instance cache, configurable timeout)
- `ProtoRegistry` — manifest-scoped protobuf schema cache
- `findManifestForUrl(manifests, url)` — URL → manifest resolver (replaces `ProviderService.initParsers()`)

See [`src/index.ts`](src/index.ts) for the complete export surface.

## Safety surface

| Threat | Mitigation |
|---|---|
| SSRF to private addresses | Host pattern rejection at manifest load + `.hostname` re-check at request time (covers `localhost`, `127/8`, `10/8`, `192.168/16`, `172.16-31`, `169.254/16`, `::1`, `fc00::/7`, `fe80::/10`, `.local`) |
| Auth header forgery | Forbidden-headers allowlist for `headers`; restricted allowlist for `rewriteHeaders` (Origin / Referer / User-Agent only) |
| ReDoS via `$regexExtract` | Pattern length cap 256, input length cap 64KB. Promise.race timeout is best-effort (V8 regex is synchronous) |
| Response size DoS | Default 5MB cap per response, configurable via `RunOptions.maxResponseBytes` |
| forEach iteration DoS | Default 1000 iterations per `forEach` step; `$range` capped at 10k inside the helper |
| Prototype pollution | Step IDs must be JS identifiers; `__proto__` / `constructor` / `prototype` rejected at manifest load |
| JSONata eval pathology | Per-instance `timeoutMs` (default 250ms) with `Promise.race` |
| Protobuf compile DoS | 64KB per schema cap; lazy-compiled and cached per `ProtoRegistry` |
| Manifest-supplied executable code | None — JSONata is the only expression language; helpers are a closed namespace; manifest cannot register code |

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm test` | Vitest |
| `pnpm type-check` | tsgo --noEmit |
| `pnpm lint` | tsgo + biome check --fix |
| `pnpm build` | Compile with tsgo |

## Dependencies

- `jsonata`, `js-md5`, `fast-xml-parser`, `protobufjs`, `zod`
