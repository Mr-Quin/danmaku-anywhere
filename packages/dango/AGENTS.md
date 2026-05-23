# Agent context: packages/dango

## Purpose

Declarative danmaku source manifest engine. Replaces hardcoded per-source TypeScript fetching with JSON manifests interpreted at runtime. Library-shippable: no extension-runtime assumptions.

A dango is a stack of items on a skewer — each pipeline is a stack of named steps producing one of (Season[], Episode[], CommentEntity[]).

## Trust model

**Manifests are trusted code.** Official ones are vetted by the project; user-installed ones come with explicit user warnings about third-party risk. The engine intentionally does NOT have DoS protections (no response-size cap, no forEach iteration cap, no eval timeout, no regex caps) — those add complexity without addressing a real threat in this model. The few guards that remain are correctness boundaries, not DoS mitigations:

- auth-header forbid-list (`Cookie`/`Authorization`/etc. rejected in `request.headers`)
- `rewriteHeaders` allowlist (Origin/Referer/UA only)
- step-id prototype-pollution rejection
- hosts allowlist for request URLs

`$range` has an internal 10k cap, but that's a typo guard (`$range(0, 1e9)` returning early instead of allocating GB), not a security control.

## Architecture in a paragraph

A `Manifest` is JSON validated by zod. Each manifest declares up to three `Pipeline`s (`search`, `episodes`, `danmaku`). Pipelines are step lists + a final JSONata `output` expression. Steps are one of three types: `http`, `assign`, `forEach`. Every templated value (URL, query, body, header, extract, output) is a JSONata expression evaluated against a mutable context. Helpers (`$md5`, `$base64Encode`, `$regexExtract`, `$permute`, etc.) are a closed namespace registered onto JSONata — manifests can't add new ones. `ManifestRunner` is the public API; `runPipeline` is the lower-level entry point.

## Files

- `src/manifest/schema.ts` — zod schema. Source of truth for what's allowed in a manifest.
- `src/engine/runner.ts` — pipeline executor. Handles variant selection, step dispatch, concurrency/throttle, abort.
- `src/engine/ManifestRunner.ts` — public class wrapping a parsed manifest. Builds a `ProtoRegistry` at construction.
- `src/engine/jsonata-eval.ts` — `JsonataEvaluator` with FIFO-bounded compile cache.
- `src/engine/http.ts` — `FetchLike` type + request builder + response parsing. Enforces hosts allowlist and the forbidden-headers list.
- `src/engine/proto.ts` — `ProtoRegistry` class. Lazy-compiles inline `.proto` text per manifest.
- `src/engine/url-match.ts` — `findManifestForUrl` for the URL → source resolver (replaces `ProviderService.initParsers`).
- `src/helpers/registry.ts` — the closed JSONata helper namespace.

## Gotchas

- **Every templated value is a JSONata expression**, not a string template. `"url": "https://api.example.com"` would evaluate `https` as a variable — wrap string literals: `"url": "'https://api.example.com'"`.
- **JSONata sequence flag**: array-projection results sometimes carry a `sequence: true` property. `normalize()` in `jsonata-eval.ts` strips it so test `toEqual` is stable.
- **Singleton-unwrap**: JSONata unwraps single-element projection results. Wrap the output expression in `[...]` to force an array.
- **`Referer` / `User-Agent` / `Origin` go in `rewriteHeaders`, not `headers`** — browser fetch silently drops them when set normally. The host applies them via DNR. Manifests setting them in `headers` are rejected at runtime.
- **`runWithDnr` is extension-side**, not engine-side. The engine just hands `rewriteHeaders` to `FetchLike.init`; whether the host applies them via DNR, sets them directly, or ignores them is the host's concern.
- **`request.headers` accepts two forms**: a static record `{ Name: expr }` where each value is an expression, OR a single expression that evaluates to a `{ Name: value }` object. Use the single-expression form when header names are dynamic (e.g. user-supplied auth headers in `builtin:ddp-compat`).
- **`request.acceptStatus`** is a per-step allowlist of HTTP status codes that should be parsed as success instead of throwing. 2xx is always accepted; opt extra statuses in here. Used by `builtin:bilibili`'s protobuf segment loop, where bilibili abuses `304` as "no more data".
- **`forEach.breakOn`** lets a forEach iteration stop the loop early. Sequential-only (the schema rejects `breakOn` + `concurrency > 1`). The predicate is evaluated against the per-iteration collected result after each iteration; truthy stops AFTER including the current iteration. Used for cursor-style pagination ("stop when this page is partial") in `builtin:tencent`'s episodes pipeline.
- **Protobuf .proto text** is carried inline in the manifest. Each `ManifestRunner` owns one `ProtoRegistry`; schemas compile on first use, then cache.
- **Step IDs must be JS identifiers** and cannot be `__proto__` / `constructor` / `prototype`.
- **Backend testing**: `mockFetcher` accepts both `string` and `Uint8Array` bodies — bytes for `format: 'proto'`.

## Helpers

`src/helpers/registry.ts` is the closed namespace callable from JSONata as `$<name>`. Current set:

- crypto: `$md5`, `$gatewayDecrypt`
- codec: `$base64Encode`, `$base64Decode`, `$hexToInt`, `$bytesToHex`
- text: `$regexExtract`, `$jsonParse`, `$jsonpUnwrap`, `$timeToSeconds`
- query/signing: `$sortedQueryString`, `$sortedRawString`
- structural: `$permute`
- misc: `$now`, `$range`

Adding a helper requires an engine release; manifests cannot register their own.

## Conventions

- `/** */` for multi-line; single-line `//` for one-liners.
- `function` declarations for named module-level functions; arrows for callbacks.
- No `any` — use `unknown` and narrow.
- All engine code must work in Node + service worker contexts. No `chrome.*` / `window.*` / DOM.
