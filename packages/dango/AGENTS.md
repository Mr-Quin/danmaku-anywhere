# Agent context: packages/dango

## Purpose

Declarative danmaku source manifest engine. Replaces hardcoded per-source TypeScript fetching with JSON manifests interpreted at runtime. Library-shippable: no extension-runtime assumptions.

A dango is a stack of items on a skewer — each pipeline is a stack of named steps producing one of (Season[], Episode[], CommentEntity[]).

## Architecture in a paragraph

A `Manifest` is JSON validated by zod. Each manifest declares up to three `Pipeline`s (`search`, `episodes`, `danmaku`). Pipelines are step lists + a final JSONata `output` expression. Steps are one of three types: `http`, `assign`, `forEach`. Every templated value (URL, query, body, header, extract, output) is a JSONata expression evaluated against a mutable context. Helpers (`$md5`, `$base64Encode`, `$regexExtract`, `$permute`, etc.) are a closed namespace registered onto JSONata — manifests can't add new ones. `ManifestRunner` is the public API; `runPipeline` is the lower-level entry point.

## Files

- `src/manifest/schema.ts` — zod schema. Source of truth for what's allowed in a manifest. Includes step-ID prototype-pollution denylist, rewriteHeaders allowlist, host-pattern validation, configSchema, variants, protoSchemas, urlMatch.
- `src/engine/runner.ts` — pipeline executor. Handles variant selection, step dispatch, concurrency/throttle, abort.
- `src/engine/ManifestRunner.ts` — public-facing class wrapping a parsed manifest. Builds a `ProtoRegistry` at construction.
- `src/engine/jsonata-eval.ts` — `JsonataEvaluator` class. Per-instance compile cache (FIFO eviction), `Promise.race` timeout, registered helpers.
- `src/engine/http.ts` — `FetchLike` type + request builder + response parsing. Enforces hosts allowlist + private-host policy + response size cap.
- `src/engine/host-policy.ts` — `isPrivateOrLocalHost` + `validateHostPattern`. Covers loopback, RFC1918, link-local, IPv6 ULA.
- `src/engine/proto.ts` — `ProtoRegistry` class. Lazy-compiles inline `.proto` text per manifest.
- `src/engine/url-match.ts` — `findManifestForUrl` for the URL → source resolver (replaces `ProviderService.initParsers`).
- `src/helpers/registry.ts` — the closed JSONata helper namespace. Adding a helper requires a code change here.

## Gotchas

- **Every templated value is a JSONata expression**, not a string template. `"url": "https://api.example.com"` would evaluate `https` as a variable — wrap string literals in single quotes inside the JSONata: `"url": "'https://api.example.com'"`. The schema docstrings call this out per field.
- **JSONata sequence flag**: array-projection results sometimes have `sequence: true` attached as a non-enumerable property. `JsonataEvaluator.normalize()` strips this so `toEqual` comparisons in tests are stable.
- **Singleton-unwrap**: JSONata unwraps single-element projection results to the bare element. Wrap the output expression in `[...]` to force an array even for length-1 results. Most test manifests do this.
- **Helper functions are pure and bounded** — anything new in `helpers/registry.ts` must not perform I/O, must not be unbounded in CPU/memory, must not throw on adversarial input. Length-cap inputs at the call site if needed (`$regexExtract` does this).
- **`runWithDnr` is extension-side**, not engine-side. The engine just hands `rewriteHeaders` to `FetchLike.init`; whether the host applies them via DNR, sets them directly, or ignores them is the host's concern.
- **Protobuf .proto text** is carried inline in the manifest. A 64KB cap is enforced before `protobuf.parse()` runs. Each `ManifestRunner` owns one `ProtoRegistry`; schemas compile on first use, then cache.
- **Step IDs must be JS identifiers** and cannot be `__proto__` / `constructor` / `prototype` — the runner writes step output to `context[step.id]`, and those keys would mutate the context's prototype on a plain object literal.
- **Promise.race-based eval timeout doesn't preempt sync work.** JSONata expressions and the regex engine run synchronously inside the eval; the timer fires only when the eval naturally yields. Length caps on `$regexExtract` are the practical defense.
- **Backend testing**: when adding tests, `mockFetcher` supports both `string` and `Uint8Array` bodies — use bytes for `format: 'proto'` payloads.

## Conventions

- Multi-line comments use `/** */` JSDoc style; single-line `//` is fine for one-liners.
- `function` declarations preferred for named module-level functions; arrow functions for callbacks.
- No `any`; use `unknown` and narrow.
- All engine code must work in Node + service worker contexts. No `chrome.*` / `window.*` / DOM.
- See `package.json` for available scripts and dependencies.
