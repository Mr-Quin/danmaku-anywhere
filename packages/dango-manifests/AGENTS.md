# Agent context: packages/dango-manifests

## Purpose

Ships the JSON manifests that drive [@danmaku-anywhere/dango](../dango/AGENTS.md). One manifest per source. This package is data + tests; engine logic lives in dango.

## Layout

- `src/manifests/*.json` — the manifests themselves. Filenames mirror the manifest `id` (`builtin:<source>` → `builtin-<source>.json`).
- `src/index.ts` — exports `BUILTIN_MANIFESTS` (an `as const` record), one `BuiltinManifestId` type, and named exports per manifest.
- `src/__tests__/<manifest>.test.ts` — per-manifest pipeline tests.
- `src/__tests__/fixtures/<source>-*.json` — captured representative responses. Each manifest owns its fixtures.

## Conventions

- Manifests are exported **unparsed**. Consumers wrap with `zManifest.parse()` at startup. Don't pre-parse in this package — that would force a dango dependency at type-level and tie shipping versions tighter than needed.
- One manifest per file. Multi-source manifest splitting is intentional; do not consolidate.
- Manifest `id` must be `builtin:<source>` for anything shipped here. Reserve other prefixes for user-installed manifests in the future.
- Tests must:
  1. Parse the manifest against `zManifest` (catches schema drift the moment dango tightens it).
  2. Mock `FetchLike` with the captured fixture for each pipeline.
  3. Assert the exact canonical shape the pipeline emits (`providerIds`, `indexedId`, `title`, etc.).
- Fixtures are captured responses, edited only to redact noise (long arrays, irrelevant fields). Keep representative shape and value types — don't substitute test placeholders that hide real-world quirks.

## Gotchas

- **URLs in manifests are JSONata expressions, not raw strings.** String literals must be wrapped in single quotes: `"url": "'https://api.example.com/path'"`. See dango's AGENTS.md.
- **Live API auth.** Some sources (e.g. DanDanPlay) require auth held by the backend proxy / a Cloudflare service-binding microservice. The manifests in this package describe the wire-level pipeline; the extension's `FetchLike` is what actually routes requests through the proxy and attaches auth. Tests in this package use fixtures and never hit the network.
- **JSON imports use `with { type: 'json' }`** — required by NodeNext module mode (see tsconfig).
- **No engine reimplementation here.** If a test fails because of dango behavior, fix dango. This package's tests are integration tests, not engine unit tests.

## Adding a manifest

1. Drop the JSON file in `src/manifests/`. Validate locally with `zManifest.parse()` in a scratch script if you want fast feedback.
2. Add it to `BUILTIN_MANIFESTS` in `src/index.ts` and re-export it by name.
3. Capture a fixture per pipeline (search/episodes/danmaku) to `src/__tests__/fixtures/`.
4. Add `src/__tests__/<source>.test.ts` covering all three pipelines.
5. Run `pnpm --filter @danmaku-anywhere/dango-manifests test`.

## Conventions (code style)

- `/** */` for multi-line; single-line `//` for one-liners.
- `function` declarations for module-level named functions; arrows for callbacks.
- No `any` — use `unknown` and narrow.
- Tests live alongside the package; vitest config only matches `src/__tests__/**/*.test.ts`.
