# DA-491 — E2E Infrastructure & Dev API

**Status:** draft (brainstorm output, awaiting user review)
**Date:** 2026-05-13
**Branch:** `DA-491_e2e-flow-tests`

## 1. Problem

The four built-in danmaku sources (DDP, Bilibili-proto, Tencent, DDP-Compat) have only manual end-to-end coverage. The DA-472 manifest refactor needs Playwright tests in place first, otherwise every refactor phase requires a 20-minute manual click-through.

A naive implementation (raw `chrome.storage` writes from the test, monkey-patched fetch hooks, flat `e2e/*.spec.ts`) works for four tests but doesn't scale: future refactors will accrete more tests, more sources, more migration scenarios. The infra has to be SOLID up front so future work just adds files instead of rewriting plumbing.

## 2. Goals

**Delivery: one PR.** The dev API skeleton, four source specs, upgrade spec, CI job, fixture commit, and cleanup all land together. Splitting them would force a second PR to add tests against an unused infra surface, with no intermediate state worth shipping.

**This PR ships:**

- Four source-flow specs (Bilibili xml + proto, Tencent, DDP, DDP-Compat) — all green.
- One upgrade-install spec exercising the v21 storage migration.
- A regression on the four-source happy path causes at least one spec to fail.
- CI runs E2E on PRs touching extension code.

**Infrastructure that must be SOLID for future work:**

- A namespace-registry **dev API** (`globalThis.__da` in SW; `window.__da` page-side) — extensible by adding files, not by editing a god-object.
- A **TestProfile**-based declarative setup — each spec describes the world it wants in one object.
- A folder structure that survives 50+ specs.

**Out of scope (this PR):**

- All `__da` namespaces beyond what the five specs need.
- `preview` env gating (architecture supports it; only `dev` and `prod` implemented).
- Codegen for the test client (hand-written `DaClient`; codegen is a future option).
- Page-side `window.__da` proxy (architecture leaves room; the specs only need SW-side).
- Visual regression, real-backend smoke tests, video-page injection flows, login UX.

## 3. Architecture

### 3.1 Build environment flag

A new tri-state Vite env var:

```
VITE_DA_ENV: 'dev' | 'preview' | 'prod'
```

- `pnpm dev` → `dev` (existing dev server).
- `pretest:e2e` → `dev` (E2E build needs the API).
- Production release builds → `prod`.

Typed in `src/vite-env.d.ts`. Defaults to `prod` if unset (safe default).

This flag is intentionally generic — future use cases (sentry env, log levels, feature flags) consume the same value rather than each adding their own flag.

### 3.2 Dev API — `__da`

A namespace-registry pattern. Each domain namespace is an inversify-injectable class living in its own file under `src/devApi/`. The index enumerates the namespace tokens, builds a registry, and attaches a single `Proxy` to `globalThis.__da` (SW) and (future) `window.__da` (page).

```
src/devApi/
  index.ts                  # entry: enumerates namespace tokens, builds registry, attaches global
  registry.ts               # defineMethod / Registry / dispatch / Proxy factory
  introspection.ts          # describe() — JSON tree of available methods
  namespaces/
    ProviderConfigNamespace.ts    # this PR — @injectable class
    StorageNamespace.ts           # this PR
    ExtensionOptionsNamespace.ts  # this PR
    RuntimeNamespace.ts           # this PR (reload, runUpgrade, version)
    # future namespaces: DanmakuNamespace, SeasonNamespace, etc.
```

**Method declaration:**

```ts
defineMethod({
  name: 'toggle',
  description: 'Toggle a provider enabled/disabled',
  kind: 'write',
  args: [
    { name: 'id', type: 'string' },
    { name: 'enabled', type: 'boolean', optional: true },
  ],
  handler: (id: string, enabled?: boolean) =>
    providerConfigService.toggle(id, enabled),
})
```

The metadata (name, description, kind, args) is what `__da.describe()` returns — a JSON tree consumable by humans and agents.

**Namespace class:**

```ts
@injectable('Singleton')
export class ProviderConfigNamespace implements DevNamespace {
  readonly name = 'providerConfig'
  readonly description = 'Read/write provider configs'

  constructor(
    @inject(ProviderConfigService)
    private readonly service: ProviderConfigService
  ) {}

  readonly methods = [
    defineMethod({ name: 'list', kind: 'read', handler: () => this.service.getAll() }),
    defineMethod({ name: 'get', kind: 'read', args: [{name:'id',type:'string'}], handler: (id) => this.service.get(id) }),
    defineMethod({ name: 'set', kind: 'write', args: [{name:'configs',type:'ProviderConfig[]'}], handler: (configs) => this.service.options.set(configs) }),
    defineMethod({ name: 'toggle', kind: 'write', /* ... */ }),
    defineMethod({ name: 'reset', kind: 'write', handler: () => this.service.options.set(defaultProviderConfigs) }),
  ]
}
```

Adding a namespace = one new file + one token added to the array in `index.ts`. No god-object growth in `index.ts`:

```ts
// src/devApi/index.ts
const NAMESPACE_TOKENS = [
  ProviderConfigNamespace,
  StorageNamespace,
  ExtensionOptionsNamespace,
  RuntimeNamespace,
] as const

export function attachDevApi(container: Container, env: DaEnv) {
  if (env === 'prod') return
  const namespaces = NAMESPACE_TOKENS.map((Token) => container.get(Token))
  const registry = buildRegistry(namespaces, { env })
  ;(globalThis as { __da?: unknown }).__da = registry.proxy
}
```

**Single execution path via Proxy:**

`__da` is a `Proxy` over `dispatch(namespace, method, args)`. Direct calls like `__da.providerConfig.toggle('builtin:bilibili', false)` are intercepted by the Proxy and funneled through `dispatch()`, which (a) checks `kind` against the env-derived gate (e.g., `preview` skips writes), (b) validates args against the method spec, (c) hands off to the handler. There is no second "direct namespaces map" code path. The future page-side bridge calls the same `dispatch()` via `chrome.runtime.sendMessage`. One source of truth for gating, telemetry, and validation.

**Read vs write tagging:**

Every method declares `kind`. For this PR both `dev` and `prod` are the only env values exercised — `dev` includes everything, `prod` strips the import entirely (DCE). The `preview` value is reserved in the type and the registry filter checks for it (`if env === 'preview', skip kind === 'write' methods`), but no build target sets `preview` yet. Fully forward-compatible.

**Safety:**

- DCE via the env-flag import boundary is the primary gate.
- A runtime double-check: `index.ts` refuses to attach if `VITE_DA_ENV === 'prod'`. (Defense in depth — protects against accidental DCE failure.)
- No filesystem leak: nothing in `src/devApi/` is referenced from app code; it's only imported by `index.ts`, and `index.ts` is only imported by the SW entry under the env guard.

### 3.3 Page-side bridging (architecture only, not built this PR)

`window.__da` will be a `Proxy` that forwards to a `chrome.runtime.onMessage` handler in the SW:

```ts
chrome.runtime.onMessage(({ kind, namespace, method, args }, sender, send) => {
  if (kind === 'devApi') {
    const result = registry.dispatch(namespace, method, args)
    send(await Promise.resolve(result))
    return true  // keep channel open for async
  }
})
```

The page proxy intercepts `__da.providerConfig.toggle(...)`, serializes `{namespace, method, args}`, sends, awaits. Same registry, single source of truth. Built when needed.

### 3.4 E2E folder structure

```
packages/danmaku-anywhere/e2e/
  fixtures/
    bilibili-search-bangumi.json     # symlinked or copied from dango-manifests
    bilibili-search-ft.json
    bilibili-season.json
    bilibili-xml.xml
    bilibili-proto-seg-1.bin         # the real protobuf dump (from the user)
    ddp-search.json
    ddp-bangumi.json
    ddp-comments.json
    ddp-compat-search.json
    ddp-compat-bangumi.json
    ddp-compat-comments.json
    tencent-search.json              # extracted from the inline test data
    tencent-episodes.json
    tencent-danmaku-base.json
    tencent-danmaku-segment-0.json
    tencent-danmaku-segment-1.json
    legacy-extension-options-v20.json
  setup/
    fixtures.ts          # Playwright extension-load fixture (existing, moved here)
    da-client.ts         # hand-written typed wrapper around serviceWorker.evaluate(__da...)
    profile.ts           # TestProfile type + applyProfile(da, profile)
    network.ts           # registerNetworkMocks(context, mocks) — wrapper over context.route
    open-browser.ts      # dev runner (existing, moved here)
  specs/
    sources/
      bilibili.spec.ts          # xml + proto sub-tests
      dandanplay.spec.ts
      dandanplay-compat.spec.ts
      tencent.spec.ts
    migration/
      upgrade-install.spec.ts
```

Existing `e2e/extension.spec.ts` (baseline tests) stays at `e2e/specs/baseline/extension.spec.ts`.

### 3.5 TestProfile

A declarative spec-side object that wraps the dev API calls a spec needs:

```ts
// e2e/setup/profile.ts
export interface TestProfile {
  providers?: {
    bilibili?: { enabled?: boolean; options?: Partial<BilibiliOptions> }
    dandanplay?: { enabled?: boolean; options?: Partial<DDPOptions> }
    tencent?: { enabled?: boolean }
  }
  customProviders?: ProviderConfig[]
  extensionOptions?: Partial<ExtensionOptions>
  // raw storage seeding for migration tests
  rawStorage?: { area: 'sync' | 'local'; key: string; value: unknown }[]
  // network mocks (Playwright context.route under the hood)
  network?: NetworkMock[]
}

export interface NetworkMock {
  pattern: string | RegExp
  respond: (route: Route) => Promise<void> | void
}

export async function applyProfile(
  context: BrowserContext,
  da: DaClient,
  profile: TestProfile
): Promise<void> {
  // 1. clear storage
  await da.storage.clear()
  // 2. apply rawStorage seeds (for migration tests, before SW upgrade runs)
  for (const seed of profile.rawStorage ?? []) {
    await da.storage.setRaw(seed.area, seed.key, seed.value)
  }
  // 3. apply provider configs (built-in + custom)
  if (profile.providers || profile.customProviders) {
    await da.providerConfig.set(buildProviderConfigs(profile))
  }
  // 4. apply extensionOptions overrides
  if (profile.extensionOptions) {
    await da.extensionOptions.update(profile.extensionOptions)
  }
  // 5. install network mocks via Playwright context.route
  for (const m of profile.network ?? []) {
    await context.route(m.pattern, m.respond)
  }
}
```

A spec then reads as:

```ts
test('bilibili: search → episode → danmaku (proto)', async ({ context, page, extensionId }) => {
  const da = new DaClient(await getServiceWorker(context))
  await applyProfile(context, da, {
    providers: {
      bilibili: { enabled: true, options: { danmakuTypePreference: 'protobuf' } },
      dandanplay: { enabled: false },
      tencent: { enabled: false },
    },
    network: [
      mockBilibiliSearch({ bangumi: bangumiFx, ft: ftFx }),
      mockBilibiliSeason(seasonFx),
      mockBilibiliProtoSegments(loadFixture('bilibili-proto-seg-1.bin')),
    ],
  })

  await openPopup(page, extensionId, '/search')
  // ... drive UI, assert ...
})
```

Per-source mock builders (`mockBilibiliSearch`, etc.) live in `e2e/setup/network.ts` so URL patterns and dispatch logic are centralized — when an upstream URL changes, one file changes.

### 3.6 Network mocks

Plain Playwright `context.route()`. Spike (this session) confirmed `context.route()` intercepts MV3 SW-originated fetches. No fetch-hook indirection needed.

The route handler is wrapped in a typed builder so specs declare intent, not URL strings:

```ts
// e2e/setup/network.ts
export const mockBilibiliSearch = (fixtures: { bangumi: any; ft: any }) => ({
  pattern: '**/api.bilibili.com/x/web-interface/search/type**',
  respond: async (route: Route) => {
    const t = new URL(route.request().url()).searchParams.get('search_type')
    await route.fulfill({ json: t === 'media_bangumi' ? fixtures.bangumi : fixtures.ft })
  },
})
```

### 3.7 protobufjs

Out of `packages/danmaku-anywhere/package.json`. Not needed at test runtime because the user supplied a real protobuf dump (`muli-1-7.09.so`, 295 KB, 3000 entries) that we commit verbatim as `e2e/fixtures/bilibili-proto-seg-1.bin`.

If we ever need to generate synthetic proto fixtures, a one-off `scripts/generate-bilibili-proto-fixture.ts` can use protobufjs as a `pnpx` dep — never enters the package's dependency tree.

### 3.8 data-testid additions

Already done this session, kept:

- `SearchForm.tsx`: `data-testid="search-input"`, `data-testid="search-submit"`.
- `SeasonCard.tsx`: `data-testid="season-card-{provider}-{id}"` on Card.
- `BaseEpisodeListItem.tsx`: `data-testid="episode-list-item-{provider}-{indexedId|title}"`.

### 3.9 CI

A new job (or extension to existing `quality`) in `.github/workflows/`:

```yaml
quality-e2e:
  if: paths-filter on packages/danmaku-anywhere/**, pnpm-lock.yaml, packages/danmaku-{converter,provider,engine}/**, packages/dango**/**
  steps:
    - pnpm install
    - pnpm build:packages
    - cd packages/danmaku-anywhere && pnpm build  # uses VITE_DA_ENV=dev so API is included
    - npx playwright install --with-deps chromium
    - cd packages/danmaku-anywhere && pnpm test:e2e
```

Cache the playwright browser install. Reuse Node setup from existing quality workflow.

## 4. Component design

### 4.1 Registry types (`src/devApi/registry.ts`)

```ts
export type MethodKind = 'read' | 'write'
export type DaEnv = 'dev' | 'preview' | 'prod'

export interface ArgSpec {
  name: string
  type: string         // human-readable, NOT TypeScript type — for describe() output
  optional?: boolean
}

export interface MethodDef<Args extends unknown[] = unknown[], Ret = unknown> {
  name: string
  description?: string
  kind: MethodKind
  args?: ArgSpec[]
  handler: (...args: Args) => Ret | Promise<Ret>
}

export function defineMethod<A extends unknown[], R>(def: MethodDef<A, R>): MethodDef<A, R> {
  return def
}

export interface DevNamespace {
  readonly name: string
  readonly description?: string
  readonly methods: readonly MethodDef[]
}

export interface Registry {
  describe(): NamespaceDescription[]
  dispatch(namespace: string, method: string, args: unknown[]): Promise<unknown>
  // The Proxy attached to globalThis.__da. Forwards every property access
  // through dispatch() so all calls share one execution path.
  proxy: unknown
}

export function buildRegistry(
  namespaces: DevNamespace[],
  options: { env: DaEnv }
): Registry {
  // 1. filter methods by kind based on env (preview = drop kind === 'write')
  // 2. assemble dispatch map { [ns]: { [method]: handler } }
  // 3. build introspection tree for describe()
  // 4. build Proxy: `__da[ns][method](...args)` → dispatch(ns, method, args)
}
```

The Proxy implementation is a two-level trap: the outer Proxy intercepts namespace access (`__da.providerConfig`) and returns an inner Proxy whose function-call trap funnels through `dispatch()`. Unknown namespaces/methods throw a typed error with a hint.

### 4.2 SW entry wiring (`src/background/index.ts` excerpt)

```ts
import { attachDevApi } from '@/devApi'

// existing IoC setup ...

if (import.meta.env.VITE_DA_ENV !== 'prod') {
  attachDevApi(container, import.meta.env.VITE_DA_ENV)
}
```

**DCE under crxjs (implementation note):** the original spec proposed a dynamic `import('@/devApi')` so prod builds DCE the whole tree. In practice that's broken under `@crxjs/vite-plugin` for MV3 service workers — `__vitePreload` never resolves, and the SW boot hangs. We instead use a static import paired with a Vite alias swap: when `VITE_DA_ENV='prod'`, `vite.config.ts` aliases `@/devApi` to a tiny stub `src/devApi/index.prod.ts` that exports a throwing no-op. The `if (false)` branch then dead-codes the call, the stub itself is tree-shaken (no other consumers), and the full devApi tree is unreachable from the bundle.

The CI grep guard (in `.github/workflows/quality-e2e.yml`) is the permanent enforcement: fails the build if any of these implementation-unique strings appear in `build/`:

- `DevApiError`
- `Unknown dev API`
- `Read/write provider configs` (namespace description)
- `Service worker lifecycle and metadata` (namespace description)

These are picked because they only exist in the implementation files, not in the stub. Verified locally: `VITE_DA_ENV=prod pnpm build` produces a bundle with zero matches.

### 4.3 DaClient (`e2e/setup/da-client.ts`)

Hand-written, mirrors `__da` shape. Each method is a `serviceWorker.evaluate` call.

```ts
export class DaClient {
  constructor(private sw: Worker) {}

  storage = {
    clear: () => this.sw.evaluate(() => self.__da.storage.clear()),
    setRaw: (area: string, key: string, value: unknown) =>
      this.sw.evaluate(([a, k, v]) => self.__da.storage.setRaw(a, k, v), [area, key, value] as const),
  }

  providerConfig = {
    set: (configs: ProviderConfig[]) =>
      this.sw.evaluate((c) => self.__da.providerConfig.set(c), configs),
    toggle: (id: string, enabled?: boolean) =>
      this.sw.evaluate(([i, e]) => self.__da.providerConfig.toggle(i, e), [id, enabled] as const),
    reset: () => this.sw.evaluate(() => self.__da.providerConfig.reset()),
  }

  extensionOptions = {
    update: (partial: Partial<ExtensionOptions>) =>
      this.sw.evaluate((p) => self.__da.extensionOptions.update(p), partial),
  }

  runtime = {
    reload: () => this.sw.evaluate(() => self.__da.runtime.reload()),
    runUpgrade: () => this.sw.evaluate(() => self.__da.runtime.runUpgrade()),
  }
}
```

**Serializability constraint:** `Worker.evaluate` arguments and return values are passed via structured clone, so they must be JSON-clonable. `setRaw(area, key, value)` validates that `value` is JSON-clonable before passing it to the SW (`JSON.stringify` round-trip), throwing a clear error if not. Documented at the method JSDoc.

Drift risk acknowledged: when a new namespace ships in `src/devApi/`, the test client must be updated by hand. Documented in `e2e/setup/README.md`. Future: codegen a `da-client.generated.ts` from the registry.

### 4.4 TestProfile defaults

`buildProviderConfigs(profile)` constructs the full `ProviderConfig[]` from the partial spec:

- All built-ins disabled by default (test isolation).
- Any provider explicitly listed in `profile.providers` overrides defaults.
- `customProviders` are appended to the array.

This means a spec that only enables Bilibili won't accidentally fire DDP requests in the background.

## 5. Test inventory (this PR)

| Spec | Profile | Network mocks | Asserts |
|---|---|---|---|
| `sources/bilibili.spec.ts:xml` | bilibili enabled, xml mode | search bangumi+ft, season, xml danmaku | search results render; click → episode list; click episode → comment count appears |
| `sources/bilibili.spec.ts:proto` | bilibili enabled, proto mode | search, season, proto seg (real fixture) | same |
| `sources/dandanplay.spec.ts` | ddp enabled | proxy URL with `path` dispatch | same |
| `sources/dandanplay-compat.spec.ts` | custom DDP-Compat config | custom baseUrl endpoints | same |
| `sources/tencent.spec.ts` | tencent enabled | MbSearch, GetPageData, /barrage/base, /barrage/segment | same |
| `migration/upgrade-install.spec.ts` | rawStorage seed of v20 extensionOptions | none | call `da.runtime.runUpgrade()`; assert providerConfig storage populated; popup loads |

Regression test (intentional break to validate): manually flip a URL in one of the network mocks and confirm at least one spec fails.

## 6. Cleanup plan

The earlier work in this branch needs pruning. To delete:

- `e2e/bilibili.spec.ts`, `ddp.spec.ts`, `tencent.spec.ts`, `ddp-compat.spec.ts`, `upgrade-install.spec.ts`, `helpers.ts`, `spike-sw-route.spec.ts` — replaced by the new structure.
- `protobufjs` from `package.json` and `pnpm-lock.yaml`.

To keep:

- `data-testid` additions in `SearchForm`, `SeasonCard`, `BaseEpisodeListItem`.

To move:

- `e2e/extension.spec.ts` → `e2e/specs/baseline/extension.spec.ts`.
- `e2e/fixtures.ts` → `e2e/setup/fixtures.ts`.
- `e2e/open-browser.ts` → `e2e/setup/open-browser.ts` (also update `package.json` script paths).

## 7. Risks / open questions

- **Inversify in the dev API**: namespaces import service tokens from the existing IoC. Initial setup may need a small refactor if some services aren't currently resolvable from outside their module.
- **DCE confidence**: addressed via the CI grep guard (§4.2). Permanent regression check, not a one-time validation.
- **Test client drift**: hand-written `DaClient` requires manual updates. Mitigated by README + lint rule (TODO: future codegen).
- **`onInstalled` race in upgrade-install spec**: `chrome.runtime.reload()` does NOT fire `chrome.runtime.onInstalled` with `reason: 'update'` for a same-version reload — it only fires it on a real version bump. So a "seed v20 → reload SW → assert v21" flow that relies on `onInstalled` would silently never run the upgrade. The migration spec uses an explicit `runtime.runUpgrade()` dev-API method (which calls `OptionsManager.tryUpgradeOptions()` directly) instead of leaning on `reload()`'s side effects.
- **`serviceWorker.evaluate` serializability**: arguments and return values must be JSON-clonable. The `DaClient.storage.setRaw` boundary validates this; other methods are typed and don't accept non-clonable shapes by construction.
- **Page-side bridge coexistence with `RpcManager` (future)**: the SW's `chrome.runtime.onMessage` is owned by `RpcManager`, which uses a kind-tagged dispatch. Adding the future page-side `__da` bridge means adding a new `kind === 'devApi'` branch in the same handler, not a parallel listener. Not built this PR but flagged so it doesn't surprise the future work.
- **DA-472 forward-compat**: dev API namespaces target the storage layer, which DA-472 won't touch — those will survive cleanly. Per-source mock builders in `e2e/setup/network.ts` (`mockBilibiliSearch`, etc.) ARE coupled to current upstream URLs; DA-472 will move those URLs into dango manifests. Acceptable: when DA-472 lands, the mock builders refactor to pull URL patterns from the manifest definitions. Localized change in one file.

## 8. Sequencing for implementation

The implementation plan (writing-plans skill output) will sequence:

1. Add `VITE_DA_ENV` flag + typed `vite-env.d.ts`.
2. Build the `src/devApi/` skeleton: registry types, four namespaces, SW wiring.
3. Build the `e2e/setup/` layer: `DaClient`, `applyProfile`, `network` builders.
4. Restructure `e2e/` folders (move existing files, update script paths).
5. Write the four source specs + upgrade spec — one at a time, run each before moving on.
6. Add CI job + paths filter.
7. Delete the dead session files; clean up `package.json`.
8. Verify regression: temporarily break one mock URL → at least one spec fails.
9. Self-review (`/review`), then PR.
