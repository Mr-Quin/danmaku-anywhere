# Occlusion Multi-Model Integration Plan (DA-9999)

Status: integration plan for the `DA-9999_anime-prototype` branch. Ties together the new
ISNet/ONNX anime mask provider, the model registry, the OPFS model cache, and R2 hosting,
and lists the exact edits a human/orchestrator must apply to shared files.

This document describes work to be applied. It does NOT itself edit any shared file.

---

## 1. Goal

Render danmaku BEHIND on-screen subjects via on-device segmentation, with a SELECTABLE
model:

- `mediapipe-selfie` (shipped in PR #435): MediaPipe selfie_segmenter, bundled, no WebGPU.
  Remains the default.
- `anime-isnet` (new): BritishWerewolf/IS-Net-Anime, ISNet ONNX, run via
  `onnxruntime-web` on the WebGPU backend, model fetched from R2 and cached in OPFS.
- `mediapipe-deeplab` (reserved): DeepLab-v3 TFLite, bundled, no WebGPU. Registered now for
  forward compatibility, hidden in the UI and not wired to a `segmenterFrame` branch yet.

All models run inside the existing hidden `chrome-extension://<id>` segmenter iframe
(`pages/segmenter.html`), driven by `OcclusionMaskService` over the existing `postMessage`
protocol. The iframe origin has its own per-origin OPFS and WebGPU, which is why fetch +
cache + ORT inference all live there.

---

## 2. Components and ownership

| Component | File | Owner | Status |
|---|---|---|---|
| OPFS model cache | `src/content/player/occlusion/modelCache.ts` (+ `.test.ts`) | worker agent | DONE, verified |
| Model registry | `src/content/player/occlusion/modelRegistry.ts` (+ `.test.ts`) | worker agent | DONE, verified |
| R2 upload script | `scripts/upload-models.mjs` | worker agent | DONE, verified |
| `OrtAnimeMaskProvider` (iframe ISNet runner) | NEW, e.g. `src/content/player/occlusion/ortAnimeRunner.ts` | orchestrator | TODO |
| Shared-file wiring | see Section 6 | human/orchestrator | TODO |
| R2 upload + CORS | Cloudflare ops | human | TODO |

The three DONE modules are pure and decoupled:

- `modelCache.ts` exports `fetchModelWithCache(options, deps?)` -> `Promise<ArrayBuffer>`.
  Reads from OPFS when present and (optionally) sha256-verified; otherwise streams the fetch
  with progress, verifies integrity, writes to OPFS, returns bytes. Falls back to a plain
  fetch when OPFS is unavailable. Supports `AbortSignal`. No repo imports, Window/Worker
  portable.
- `modelRegistry.ts` exports the `OcclusionModelId` union, `ModelDescriptor` per model,
  `DEFAULT_MODEL_ID`, `MODELS` / `MODEL_IDS`, `getModel`, `getModelOrDefault`,
  `isOcclusionModelId`, and `selectModel(chosen, { webGpu })`. Pure metadata, zero
  heavy-runtime imports, loads cheaply on BOTH the content script and the iframe.
- `upload-models.mjs` content-addresses, hashes, and (with `--commit`) uploads the `.onnx`
  to R2; dry-run by default; prints a paste-ready registry line `{ name, url, sha256, bytes }`.

---

## 3. End-to-end runtime flow (anime model)

```
DanmakuManager.service.ts
  reads danmakuOptions.occlusionModel  ──────────────────────────────┐
                                                                      v
createMaskProvider(modelId, { webGpu: 'gpu' in navigator })
  if IS_DA_E2E -> MockMaskProvider
  else model = selectModel(modelId, { webGpu })   // downgrades to default if unusable
       new IframeMaskProvider(model)              // model = resolved ModelDescriptor
                                                                      │
IframeMaskProvider.init()                                             v
  postMessage { __da:'occlusion', type:'init', model: descriptor.id,
                url: descriptor.url, inputSize: descriptor.inputSize, sha256 }
                                                                      │
segmenterFrame.ts  init handler                                       v
  branch on msg.model:
    'mediapipe-selfie' | 'mediapipe-deeplab' -> existing MediaPipe path
    'anime-isnet' -> OrtAnimeMaskProvider:
        1. probe WebGPU; if absent -> reply {type:'init', ok:false, error:'webgpu-unavailable'}
        2. ort.env.wasm.wasmPaths = chrome.runtime.getURL('ort/')   // LOCAL wasm (MV3)
        3. buf = await fetchModelWithCache({ id, url, sha256, signal, onProgress })  // R2 -> OPFS
        4. session = await ort.InferenceSession.create(buf, { executionProviders:['webgpu'] })
        5. reply {type:'init', ok:true}
                                                                      │
segment round-trip (UNCHANGED protocol):                             v
  parent -> frame {type:'segment', bitmap, threshold?}, transfer [bitmap]
  frame:
    - resize bitmap to inputSize (1024), NCHW [1,3,1024,1024], normalize (x/255 - 0.5)
    - run inference -> raw Float32 logits [_,_,h,w]
    - THRESHOLD logits to Uint8: subject/high-saliency -> 0 (person/hidden),
      background -> 1 (shown)   <-- NEW step the prototype lacks
    - close the input bitmap (ownership!)
    - reply {type:'segment', ok:true, dims:{w,h}, bytes:Uint8Array}, transfer [bytes.buffer]
  provider rebuilds { category: bytes, maskSize:{ width:dims.w, height:dims.h } }
```

The MediaPipe convention is `category` value `0` = person/hidden, non-zero = background/shown
(`OcclusionMaskService.defaultIsPerson` checks `value === 0`). The ORT path MUST match this or
the mask is inverted.

---

## 4. The `OrtAnimeMaskProvider` (iframe ISNet runner) — spec for the orchestrator

Create a NEW module, e.g. `src/content/player/occlusion/ortAnimeRunner.ts`, imported by
`segmenterFrame.ts` only in the `'anime-isnet'` branch (dynamic `import()` so ORT is not
pulled into the MediaPipe-only path). Port from the verified prototype `animeTest.ts` but
make it the iframe runtime, not a page harness.

Required behavior:

1. **Imports**: `import * as ort from 'onnxruntime-web/webgpu'` (the `/webgpu` subpath, not
   bare). `import { fetchModelWithCache } from './modelCache'`. Optionally
   `import { getModel } from './modelRegistry'` for `url` / `inputSize` (cheap, no runtime
   imports) — or use the `url` / `inputSize` forwarded in the init message to avoid a second
   lookup.
2. **WASM paths**: `ort.env.wasm.wasmPaths = chrome.runtime.getURL('ort/')`. ORT wasm MUST
   stay local (MV3 forbids remote wasm-eval). Only the `.onnx` DATA file comes from R2.
3. **WebGPU probe FIRST**: if `!('gpu' in navigator)` (or `navigator.gpu.requestAdapter()`
   resolves null), reply `{type:'init', ok:false, error:'webgpu-unavailable'}` and do not
   create a session. The prototype is WebGPU-only with no wasm fallback; a 176MB model on
   the wasm backend at 1024px would be unusably slow, so disable rather than fall back.
4. **Model load**: replace the prototype's
   `await (await fetch(getURL('models/anime-isnet.onnx'))).arrayBuffer()` with
   `const buf = await fetchModelWithCache({ id: 'anime-isnet', url, sha256, signal, onProgress })`.
   Then `session = await ort.InferenceSession.create(buf, { executionProviders: ['webgpu'] })`.
   Call `fetchModelWithCache(options)` with NO second arg in production (defaults wire real
   OPFS/fetch/crypto).
5. **Preprocess** (from `animeTest.ts`): resize the `ImageBitmap` to `inputSize` x `inputSize`
   (1024). Build NCHW `[1, 3, inputSize, inputSize]` Float32, RGB, normalize `(x/255 - 0.5)`
   (ISNet preprocessor_config: mean 0.5, std 1.0). Feed via `session.inputNames[0]`.
6. **Postprocess (NEW, load-bearing)**: read raw Float32 logits from
   `session.outputNames[0]`, dims `[_, _, h, w]`. Convert to the shared Uint8 mask:
   subject/high-saliency -> `0`, background -> `1`. The prototype only min-max normalizes for
   visualization and never produces this Uint8 path. Recommended: apply `sigmoid`, then
   `prob >= threshold ? 0 : 1` (threshold default `0.5`, taken from the `segment` message).
   Decide subject polarity by inspecting ISNet output (saliency: high = subject). Validate the
   polarity visually in browser-verify before locking it in.
7. **Ownership / lifecycle**:
   - In `segment`, after preprocessing, `frame.close()` the input bitmap (the protocol invariant
     is that `segment` takes ownership).
   - Reply `{type:'segment', ok:true, dims:{ w, h }, bytes}` transferring `[bytes.buffer]`.
   - On any failure reply `{type:'segment', ok:false, error}` so the provider resolves `null`.
   - Respect the 5s `SEGMENT_TIMEOUT` and 15s `INIT_TIMEOUT` already enforced provider-side.
   - Provide a `dispose()` that releases the session (`session.release?.()`) and any GPU
     buffers.
8. **Per-runtime state isolation**: the MediaPipe path uses a monotonic
   `lastTimestamp = Math.max(t0, lastTimestamp + 1)` for `segmentForVideo`. Keep ORT state
   separate so the two runtimes do not corrupt a shared `lastTimestamp` if both ever coexist
   in one iframe instance.
9. **Resolution tuning**: 1024px per-frame on WebGPU may exceed the ~80ms `OcclusionMaskService`
   interval and the 5s SEGMENT timeout under load. Make `inputSize` for the LIVE path a
   tunable: if 1024 is too slow, run inference at a smaller size (e.g. 512) independent of the
   registry's nominal `inputSize`. Add a `liveInputSize` field to the descriptor rather than
   overloading `inputSize` if you split them.

---

## 5. Load order (build + runtime)

### Build / asset provisioning (must happen before dev or CI build)

1. `copy-mediapipe.mjs` (or a new sibling `copy-ort.mjs`) copies ORT wasm from
   `node_modules/onnxruntime-web/dist` into `public/ort/`. The `/webgpu` build needs the jsep
   `.mjs` + `.wasm`; also copy the asyncify and base `ort-wasm-simd-threaded` `.mjs`/`.wasm`
   to match the hand-copied set. Hard-list the files (mirror `WASM_FILES` in
   `copy-mediapipe.mjs`). Wire it into the existing `prebuild` / `predev` / `predev:browser`
   hooks so a fresh checkout/CI has the wasm. **This is currently MISSING** — `public/ort/` is
   git-ignored and hand-copied, so a clean build breaks without it.
2. The `.onnx` model is NOT bundled (176MB). It is uploaded to R2 (Section 7) and fetched at
   runtime. Do not commit it. Do not add it to a copy step.

### Runtime load order (anime path, per init)

1. Content script computes `{ webGpu: 'gpu' in navigator }`, calls `createMaskProvider`.
2. `selectModel` resolves the descriptor (downgrades to default if WebGPU absent or id stale).
3. `IframeMaskProvider.init()` creates/loads the iframe, waits for `{type:'ready'}`, sends
   `{type:'init', model, url, inputSize, sha256}`.
4. Iframe: probe WebGPU -> set `ort.env.wasm.wasmPaths` (local) -> `fetchModelWithCache`
   (OPFS hit returns immediately; miss streams from R2 with progress) -> create ORT session ->
   reply init ok.
5. First `segment` after init ok begins inference.

ORT wasm always loads locally; only the `.onnx` may be remote. Never set `wasmPaths` to a
remote URL.

---

## 6. EXACT edits to shared files

Apply these AFTER the worker-created files are in place. The worker agents must NOT make these
edits; the human/orchestrator does.

### 6.1 `modelRegistry.ts` ownership note (no edit, decision)

`OcclusionModelId` is a WIRE FORMAT persisted in `danmakuOptions.occlusionModel`. Let
`modelRegistry.ts` own the union; `constant.ts` imports it. If `common/` importing from
`content/` is undesirable in this codebase, flip ownership (declare the union in `constant.ts`,
import into the registry). Pick one deliberately. The notes below assume registry-owns-the-union.

### 6.2 `src/common/options/danmakuOptions/constant.ts`

- Add imports:
  ```ts
  import type { OcclusionModelId } from '@/content/player/occlusion/modelRegistry'
  import { DEFAULT_MODEL_ID } from '@/content/player/occlusion/modelRegistry'
  ```
- In `DanmakuOptions`, next to `occlusionQuality`, add:
  ```ts
  readonly occlusionModel: OcclusionModelId
  ```
- In `defaultDanmakuOptions`, add:
  ```ts
  occlusionModel: DEFAULT_MODEL_ID,
  ```

### 6.3 `src/common/options/danmakuOptions/service.ts`

The schema is at v10 (shipped in PR #435). Add a NEW v11 (do NOT fold into v10). Append AFTER
the `.version(10, ...)` block (around line 144):

```ts
.version(11, {
  upgrade: (data) =>
    produce<PrevOptions>(data, (draft) => {
      draft.occlusionModel = DEFAULT_MODEL_ID
    }),
})
```

Import `DEFAULT_MODEL_ID` from `modelRegistry` (or hardcode `'mediapipe-selfie'` to keep the
migration self-contained). `PrevOptions` is already imported from `../OptionsService/types`.

### 6.4 `src/content/player/occlusion/createMaskProvider.ts`

Change the signature and selection. Keep the E2E branch FIRST.

```ts
import type { OcclusionModelId } from './modelRegistry'
import { selectModel } from './modelRegistry'
import type { SelectModelCapabilities } from './modelRegistry' // if exported; else inline { webGpu: boolean }

export function createMaskProvider(
  modelId: OcclusionModelId,
  capabilities: SelectModelCapabilities
): MaskProvider {
  if (IS_DA_E2E) {
    return new MockMaskProvider()
  }
  const model = selectModel(modelId, capabilities)
  return new IframeMaskProvider(model)
}
```

Caller computes `capabilities` as `{ webGpu: 'gpu' in navigator }`.

### 6.5 `src/content/player/occlusion/IframeMaskProvider.ts`

- Constructor takes the resolved `ModelDescriptor`.
- In the parent->frame init message (around lines 53-56), include the model fields:
  ```ts
  iframe.contentWindow?.postMessage(
    {
      __da: CHANNEL,
      type: 'init',
      model: descriptor.id,
      url: descriptor.url,
      inputSize: descriptor.inputSize,
      sha256: descriptor.sha256,
    },
    '*'
  )
  ```
- Handle an init failure reply (`ok:false, error`) by surfacing it so the provider can resolve
  a graceful "disabled" state (e.g. `init()` rejects or sets a disabled flag and `segment`
  returns `null`). This lets the WebGPU-unavailable path degrade cleanly.
- The `segment` round-trip is UNCHANGED.

### 6.6 `src/content/player/occlusion/segmenterFrame.ts`

In the init handler (around lines 51-55), branch on `msg.model`:

```ts
if (msg.model === 'anime-isnet') {
  const { createOrtAnimeRunner } = await import('./ortAnimeRunner')
  runner = await createOrtAnimeRunner({
    url: msg.url,
    inputSize: msg.inputSize,
    sha256: msg.sha256,
    signal,
    onProgress: (p) => {
      parent.postMessage({ __da: CHANNEL, type: 'init-progress', loaded: p.loaded, total: p.total }, '*')
    },
  })
  // runner exposes segment(bitmap, threshold) and dispose()
} else {
  // existing MediaPipe path for 'mediapipe-selfie' (and later 'mediapipe-deeplab')
}
```

- Keep the existing `PERSON_CATEGORY = 0` convention. The ORT runner returns Uint8 already in
  that convention.
- In the segment handler, dispatch to the active runtime's `segment`. The dynamic `import()`
  keeps ORT out of the MediaPipe-only bundle.
- Probe WebGPU inside the runner (Section 4.3) and reply `{type:'init', ok:false}` when absent.
- Emit `init-progress` messages (optional but recommended) so the provider/UI can show the
  first-enable download (Section 8).

### 6.7 `src/content/player/occlusion/types.ts`

Likely NO change to `SegmentationResult` / `SegmentOptions` / `MaskProvider`. If you add
init-progress to the provider surface (for download UX), extend it additively (e.g. an optional
`onInitProgress?` callback on the provider constructor or an event), not by changing the three
core interfaces.

### 6.8 `DanmakuManager.service.ts`

Where it constructs the mask provider, read `danmakuOptions.occlusionModel` and forward it plus
capabilities:

```ts
const provider = createMaskProvider(options.occlusionModel, { webGpu: 'gpu' in navigator })
```

If the model id can change at runtime (settings toggled while playing), dispose and recreate the
provider on `occlusionModel` change, same as for `occludeBehindPeople`.

### 6.9 `src/common/components/DanmakuSettingsPageCore/DanmakuStylesForm.tsx`

Inside the existing "Render behind people" `SettingsBlock`, add a model picker (Select or
SegmentedTabs):

- Source options from `MODELS` (or `MODEL_IDS` -> `getModel`) imported from `modelRegistry`.
- Render each option's `labelKey` through `t()`.
- Bind value to `danmakuOptions.occlusionModel`; `onChange` -> `partialUpdate`.
- Disable / annotate the `anime-isnet` option when `!('gpu' in navigator)` (the `selectModel`
  downgrade is the safety net, but the UI should reflect it).
- HIDE `mediapipe-deeplab` until its `segmenterFrame` branch + TFLite asset land (filter it out
  of the rendered options for now).
- Add i18n keys: `danmaku.occlusion.model.mediapipeSelfie`, `.mediapipeDeeplab`, `.animeIsnet`,
  and a section label. Then run `pnpm i18n extract` (from `packages/danmaku-anywhere`).

### 6.10 `vite.config.ts`

NO change required to ship the picker. `segmenter.html` is already an input; the anime-test
harness is already wired non-prod. Do NOT add the `.onnx` as an input.

### 6.11 `manifest.ts`

NO change required:

- `web_accessible_resources` already wildcards `['**/*', '*']`, so `ort/` and `models/` are
  exposed.
- CSP `extension_pages` is `script-src 'self' 'wasm-unsafe-eval'; object-src 'self'` with NO
  `connect-src` directive, so `connect-src` falls back to `default-src` (unset) and the
  cross-origin fetch to R2 is currently allowed.
- `unlimitedStorage` is already granted (good for the OPFS cache).

**Guard rail**: if anyone later ADDS a `connect-src` directive to the segmenter/extension CSP,
it MUST include `https://assets.danmaku.weeblify.app` or the iframe's R2 fetch is blocked. Leave
a comment near the CSP noting this. The segmenter is an extension page, so `host_permissions` do
not gate its fetch; CSP `connect-src` is the only relevant gate.

### 6.12 `copy-mediapipe.mjs` / new `copy-ort.mjs` + `package.json`

- Add a copy step for ORT wasm (Section 5, step 1). Either extend `copy-mediapipe.mjs` to also
  mirror `node_modules/onnxruntime-web/dist` -> `public/ort/`, or add a sibling `copy-ort.mjs`.
  Hard-list the wasm/mjs files (jsep + asyncify + base `ort-wasm-simd-threaded`).
- `package.json` (extension):
  - Add `"upload-models": "node scripts/upload-models.mjs"` (manual step, NOT a build hook).
  - If you add `copy-ort.mjs`, wire it into `prebuild` / `predev` / `predev:browser` alongside
    `copy-mediapipe`.

---

## 7. R2 hosting

Use the EXISTING R2 bucket bound as `FILES_BUCKET` in `backend/proxy/wrangler.json` (verified):

- staging bucket: `danmaku-anywhere-file-staging` (preview `danmaku-anywhere-file-staging-preview`)
- production bucket: `danmaku-anywhere-file`

Do NOT create a new bucket. Use a `models/` key prefix. Same bucket family as the ffmpeg
precedent (commit `80a8e68a` / DA-397), which fetches
`https://assets.danmaku.weeblify.app/ffmpeg/ffmpeg-core.wasm` at runtime — proving the assets
host serves R2 objects publicly cross-origin.

Upload with the new script (dry-run by default):

```
node scripts/upload-models.mjs                                                  # dry-run, staging
node scripts/upload-models.mjs --json                                          # dry-run, JSON registry array
node scripts/upload-models.mjs --commit                                        # upload to staging (local sim unless --remote)
node scripts/upload-models.mjs --bucket danmaku-anywhere-file --remote --commit   # upload to PROD
```

The script content-addresses keys (`models/anime-isnet-<first12ofsha256>.onnx`) so each URL is
immutable -> `Cache-Control: public, max-age=31536000, immutable`,
`Content-Type: application/octet-stream`. It prints `{ name, url, sha256, bytes }`; paste `url`
and `sha256` into the `anime-isnet` descriptor in `modelRegistry.ts` (update `ANIME_ISNET_URL`
and the `sha256` slot).

**Run the script from the worktree** (`danmaku-anywhere-DA-9999-live-segmentation`) or pass an
absolute `--file`, since the 176MB model lives in the worktree's `public/models/`, not the main
checkout.

### Required CORS (load-bearing)

The segmenter iframe origin is `chrome-extension://<id>`, so the R2 fetch is cross-origin and
the bucket MUST return `Access-Control-Allow-Origin`. Recommended (public model):

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD
Access-Control-Allow-Headers: Range
Access-Control-Expose-Headers: Content-Length, Content-Range, ETag
```

`*` avoids enumerating both the unpacked-dev id and the published-store id (they differ). Apply
via `wrangler r2 bucket cors set <bucket> ...` or the dashboard. The upload script sets only
per-object headers; bucket-level CORS is a one-time policy the human applies.

### Caveats

- The `assets.danmaku.weeblify.app` -> bucket mapping is an R2 custom domain configured in the
  Cloudflare dashboard, NOT in `wrangler.json`. Confirm WHICH bucket that domain serves (the
  ffmpeg object lives there) and upload the model to THAT bucket, or the printed URL 404s. Pass
  `--bucket` / `--host` to match if it differs from `FILES_BUCKET`.
- `wrangler` is a devDependency `^4.76.0` in `backend/proxy/package.json` (not root). The script
  shells out via `pnpx wrangler` with `--config=backend/proxy/wrangler.json` and assumes
  Cloudflare credentials are present.
- Strongly prefer a quantized int8 variant (~42MB) over the 176MB full ISNet for a bearable
  first-run download.
- Only the `.onnx` DATA file is hosted. ORT wasm stays local (MV3 forbids remote wasm-eval).

---

## 8. WebGPU gating + graceful fallback

Two layers, belt and suspenders:

1. **Content-side cheap gate**: `createMaskProvider` calls `selectModel(modelId, { webGpu: 'gpu'
   in navigator })`, which downgrades `anime-isnet` to `DEFAULT_MODEL_ID` when WebGPU is absent
   or the id is stale. The default (`mediapipe-selfie`) is asserted to never require WebGPU, so
   the fallback always lands on a usable model (no recursion into an unusable default).
2. **Iframe-side authoritative probe**: the ORT runner re-probes WebGPU (and ideally
   `navigator.gpu.requestAdapter()`) before creating the session; if absent it replies
   `{type:'init', ok:false, error:'webgpu-unavailable'}`. `IframeMaskProvider` surfaces this and
   degrades (mask disabled, danmaku renders normally; optionally a one-time toast/log).

UI: `DanmakuStylesForm` disables/annotates the anime option when `!('gpu' in navigator)` so the
user understands why it is unavailable.

There is intentionally NO wasm fallback for the 176MB anime model — it would be too slow to be
usable. Disable, do not fall back.

---

## 9. First-enable download UX

The anime model is large (176MB full; aim for ~42MB int8). First selection triggers an R2
download cached in OPFS; subsequent loads are instant from OPFS.

- `fetchModelWithCache` reports `{ loaded, total }` via `onProgress`. The ORT runner forwards
  these as `{type:'init-progress', loaded, total}` messages to the parent.
- `IframeMaskProvider` exposes progress (additive callback / event) so the settings UI or an
  overlay can show "Downloading anime model... N%".
- Cancellation: pass an `AbortSignal` from the provider into `fetchModelWithCache`; if the user
  flips off the model or switches away mid-download, abort the fetch. The cache checks the signal
  before fetch and per read-loop iteration.
- Integrity: ship a `sha256` in the descriptor so the cache evicts + re-downloads a
  truncated/corrupt cached file. Without it, a non-empty partial file passes the `byteLength > 0`
  check and is served as-is.
- Persistence: `fetchModelWithCache` requests `navigator.storage.persist()` best-effort so the
  large cache survives eviction (`unlimitedStorage` already granted).
- Suggested UX: keep `occludeBehindPeople` on with the default model while the anime model
  downloads in the background; switch to the anime mask once init ok arrives. Show a spinner /
  percentage in the settings block next to the picker.

---

## 10. Test plan (ordered)

Existing, already green (keep passing):

1. `modelCache.test.ts` — 7 tests: OPFS hit, hit with integrity match, partial/corrupt evict +
   re-download, OPFS-unavailable plain-fetch fallback, abort before fetch, abort mid-stream,
   no-sha256 skips verification. Run:
   `_ZO_DOCTOR=0 pnpm exec vitest run src/content/player/occlusion/modelCache.test.ts`.
2. `modelRegistry.test.ts` — 11 tests: default selection, anime->default downgrade when no
   WebGPU, unknown/stale id -> default, type guard, hosted-has-url / bundled-has-none, default
   never requires WebGPU. Run:
   `_ZO_DOCTOR=0 pnpm exec vitest run src/content/player/occlusion/modelRegistry.test.ts`.

New tests to add (each with a 3-6 line JSDoc header right after imports):

3. `ortAnimeRunner.test.ts` (vitest, mock `onnxruntime-web/webgpu` and `chrome.runtime`):
   - preprocess produces NCHW `[1,3,1024,1024]` with values in `[-0.5, 0.5]` (i.e. `x/255 - 0.5`).
   - postprocess maps logits -> Uint8 with subject -> `0`, background -> `1` (assert polarity
     matches `OcclusionMaskService.defaultIsPerson`, value `0` = hidden).
   - threshold from the `segment` message is respected (e.g. higher threshold yields fewer
     hidden pixels).
   - `segment` closes the input bitmap (ownership invariant) and transfers `bytes.buffer`.
   - WebGPU-absent -> init replies `ok:false`.
   - failure path -> segment replies `ok:false` (provider resolves null).
4. Optional integration test of `createMaskProvider`: with mocked `selectModel`, asserts the E2E
   branch returns `MockMaskProvider` first, and that a WebGPU-absent anime id yields a provider
   built from the default descriptor.
5. Migration test for danmakuOptions v11: a v10 options object upgrades to include
   `occlusionModel: 'mediapipe-selfie'` and existing fields are preserved.

Static checks (fast, run for every change):

6. `_ZO_DOCTOR=0 pnpm type-check`
7. `_ZO_DOCTOR=0 pnpm lint`
8. Affected-only test sweep: `pnpm --filter '...[origin/master]' test`.

Browser verification (after wiring, via the browser-verify skill or `pnpm dev:browser`):

9. Build packages first (`pnpm build:packages`), copy ORT wasm into `public/ort/`, ensure the
   model is uploaded to R2 + CORS set, and set `ANIME_ISNET_URL` + `sha256` in the registry.
10. Load the extension, enable "Render behind people", select the anime model on a WebGPU
    machine. Confirm: first-enable download progress shows; OPFS caches the model (second enable
    is instant); the mask hides danmaku behind the on-screen subject (correct polarity, NOT
    inverted); no console errors; ORT wasm loads from `chrome-extension://<id>/ort/` (not remote);
    the `.onnx` loads from `assets.danmaku.weeblify.app` once then from OPFS.
11. On a non-WebGPU machine (or with `navigator.gpu` stubbed off): the anime option is disabled
    in the UI; selecting it (or a persisted stale selection) downgrades to MediaPipe; danmaku
    still render; no crash.
12. Toggle the model while playing: provider disposes/recreates cleanly; no leaked sessions or
    iframes (cross-check the scraper-leak fixes pattern from commit `77e628b7`).

---

## 11. Risks / open items

- ORT wasm copy step is MISSING; a fresh checkout/CI build breaks until `copy-ort.mjs` (or an
  extended `copy-mediapipe.mjs`) lands and is wired into the build hooks.
- Model is 176MB full; prefer a quantized int8 (~42MB) before shipping. First-run download must
  be progress-reportable, cancellable, integrity-checked (ship `sha256`), and OPFS-cached.
- Mask polarity: the prototype emits unbounded logits and only min-max normalizes for
  visualization (its `sigmoid` is unused). The runner MUST produce subject -> `0` /
  background -> `1`. Verify polarity in-browser; an inverted mask hides danmaku over the
  background instead of the subject.
- 1024px per-frame WebGPU inference may exceed the ~80ms interval and the 5s SEGMENT timeout
  under load; consider a smaller `liveInputSize`.
- CORS is the most likely runtime failure; if the assets-host bucket does not return
  `Access-Control-Allow-Origin` for the extension origin, the fetch fails opaquely. Set bucket
  CORS to `*` for the public model.
- Assets-host -> bucket mapping is dashboard-config, not in `wrangler.json`; upload to the bucket
  that domain actually serves or the URL 404s.
- WebGPU availability inside the `chrome-extension://` iframe is unverified at the time of
  writing; the iframe-side probe + graceful disable cover it, but confirm in browser-verify.
- Import direction: registry (`content/`) owns `OcclusionModelId`; if `common/` must not import
  from `content/`, flip ownership. One-line decision, make it deliberately.
- Keep per-runtime ORT/MediaPipe state separate so the MediaPipe monotonic `lastTimestamp` is
  not corrupted if both runtimes ever coexist in one iframe instance.
