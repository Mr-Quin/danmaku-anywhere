# Agent context: packages/danmaku-anywhere

## Purpose

Chrome/Firefox browser extension that injects danmaku (bullet comments) onto video pages. This is the main user-facing product.

## Tech stack

- React 19, TypeScript, Vite (via @crxjs/vite-plugin)
- MUI (Material UI) for components
- Zustand for client state, TanStack Query for server state
- React Hook Form + Zod for form validation
- Inversify for dependency injection
- Dexie (IndexedDB) for local storage
- i18next for internationalization

## Architecture

The extension runs across three isolated contexts that communicate via RPC (`src/common/rpc/`):

- **Background service worker** — persistent logic, API calls, database access
- **Content scripts** — injected into web pages, manages danmaku overlay on video elements
- **Popup** — extension popup UI for settings and manual controls

Inversify IoC container (`src/common/ioc/`) wires up dependencies across these contexts.

The player frame mounts the danmaku overlay in a shadow root (`#danmaku-anywhere-player`, open in e2e builds / closed in prod). `DanmakuLayoutService` builds `wrapper` → `container` (danmaku comments) + `uiLayer` (in-player UI: skip button, info panel; `position: absolute`, `pointer-events: none`, z 10000), positioned over the `<video>`. Theme tokens (`--da-*`) are injected onto the shadow `:host` via `buildSakuraCssVars(mode)`.

Season identity is `(providerConfigId, indexedId)`, enforced by a unique Dexie index. A season belongs to the provider config instance that fetched it; the row's `manifestId` only names the source type for chips and filters. Built-in configs have `id === manifestId` (`isBuiltinConfig`), so deleting and re-adding one reattaches its seasons. A re-created custom instance gets a new uuid, so the old seasons stay orphans: viewable, not refetchable, bookmarks dropped with the config. There is no relink action yet. Never derive season identity from config values such as `baseUrl`; editing a config must not detach its seasons, which is also why the form hides a built-in's server fields.

## Conventions

- Functional components with hooks only
- Zustand for global client state, `useState` for local state
- TanStack Query for all server/async state
- React Hook Form + Zod for form validation
- Error boundaries for error handling
- Inversify IoC container for dependency injection

## Testing conventions

- **Every test file gets a header JSDoc block** (3-6 lines) describing what the test exercises and what it asserts. Place it immediately after imports, before the first `test()`. Treat it as the spec a future reader sees first. **No narration inside the test body** — default to no comments; add one only when removing it would mislead the next reader (footguns, races, library quirks). Well-named identifiers do the WHAT.
- e2e specs live under `e2e/specs/<area>/<source>.spec.ts`. Use the `Popup` POM in `e2e/pom/` and the `applyProfile` helper in `e2e/setup/` instead of touching selectors or chrome.storage directly. Per-source mock builders live in `e2e/network/<source>.ts`.
- e2e has its own doctrine — read `e2e/AGENTS.md` before adding or modifying specs. It covers test taxonomy (unit vs package-integration vs e2e), the "user-visible signal required" rule, network strict-mode and console-error opt-outs, and what hacks to avoid.
- **Run only affected e2e locally.** The full suite is for CI, never for a local loop. Run the spec(s) that exercise the surface you changed — e.g. `pnpm exec playwright test e2e/specs/sources/dandanplay.spec.ts` for the popup search → details flow, or `e2e/specs/mount/` for danmaku-tree changes — and at most `pnpm test:e2e:smoke` on top. `pnpm test:e2e:changed` follows direct imports only and selects nothing for a content-script edit, so do not read a clean run from it as coverage.

## Gotchas

- `@crxjs/vite-plugin` has its own HMR behavior — don't confuse with standard Vite
- Content scripts run in an isolated world — communication with the page requires messaging
- **`offsetParent` works for in-player elements despite the shadow root.** They mount under the positioned `uiLayer` in the same tree, so `offsetParent`/`parentElement` resolve to it. AI reviewers reliably claim `offsetParent` is `null` "in shadow DOM" — it isn't here, and the info-panel e2e covers the positioning that would break if it were.
- **In-player CSS uses `--da-*` tokens, never hardcoded colors.** The shadow `:host` is themed and supports light mode, so `rgba(255, 255, 255, ...)` vanishes on a light surface. Use `var(--da-text)` or `color-mix(in srgb, var(--da-text) N%, transparent)` (see `SkipButton.css`, `PlayerInfoPanel.css`).
- **Player activity/idle is shared via `PlayerIdleService`.** Consumers (info panel, density chart) subscribe; don't add your own `document` listeners. Activity is gated by pointer geometry over the video's rect: the overlays are `pointer-events: none` so you can't listen on them, and the `<video>` itself misses pointer events over the in-player controls. Don't reduce it to a bare `document` listener or a `target.contains(video)` DOM test — both count the whole page.
- **The popup's target tab is not always the active tab.** A popup page opened in its own window or tab (open-in-new) is itself the active tab of its window, so it carries `?tabId=` for the tab it was opened from. Resolve the tab through `src/common/rpc/targetTab.ts`; a bare `chrome.tabs.query({ active: true, currentWindow: true })` in popup code reads the popup.
- **Popup pages that read in-memory state must survive a reopen.** The popup restores its last route from session storage, but the zustand store (`src/popup/store.ts`) and router location state start empty. A route whose page needs either declares `handle: restoreTo('<parent>')` in `src/popup/router/router.tsx`, and the page redirects to its parent with `<Navigate replace />` when the state is missing (it can also be reached that way through open-in-new-tab).
- **zh terminology: "mount" is 装填** (e.g. 已装填, 装填弹幕), not 加载 or 挂载. Keep new strings consistent.
- **i18n workflow**: after adding or changing translation keys in source code, run `pnpm i18n extract` in this package to regenerate the JSON files (it sorts keys and removes unused ones). Then translate any new entries in the `zh` locale file. CI validates that extracted keys match the committed JSON — commits will fail the `Validate i18n translations` check if extraction is skipped.
- **Build output dir depends on the command.** `pnpm dev:browser` and a bare `vite build` write to `dev/chrome`; `pnpm run build` writes to `build/` via `--outDir build`, which is what the e2e suite loads; Playwright refuses to run if it is stale and tells you to rebuild. When loading a manual build into a browser, install the dir you actually just wrote, not whichever was there before: a stale `build/` silently runs old code, and the build banner's `gitBranch` still reads correct so it looks fine. Confirm freshness with `ls dev/chrome/manifest.json` (or grep the compiled `assets/*.js` for your change), not the banner.
- **A boolean `define` behaves differently under vitest vs `vite build`/`vite dev`.** An entry like `'import.meta.env.VITE_FOO': JSON.stringify(true)` inlines to a real `true`/`false` literal in a production build and in the dev server, but under vitest it surfaces as a truthy string (`"true"`/`"false"`) instead. Encode flags read via `import.meta.env` as strings (`JSON.stringify('true')`/`JSON.stringify('false')`) and type them as a string union in `vite-env.d.ts`, not `boolean`, so the same comparison holds in every mode.
- **`pnpm <script>` can run in a sibling worktree.** From inside a worktree, `cd packages/danmaku-anywhere && pnpm <script>` sometimes resolves into a different danmaku-anywhere worktree (the banner prints another branch). Pin it: absolute-path `cd` to this worktree's package dir and invoke the binary directly (`pnpm exec <bin>` or `./node_modules/.bin/<bin>`), and confirm with `git rev-parse --abbrev-ref HEAD`.
- Queries follow changes made in other contexts through `src/common/queries/followBackgroundChanges.ts`, which covers chrome.storage writes and the data-change channel. A background service whose state the UI reads announces its changes on that channel (see `ManifestRegistry`); don't add storage or message listeners in hooks or pages.
- **Option store readiness**: every option store has a descriptor in `src/common/options/optionStores.ts` (key, storage area, latest version). Bump `latestVersion` there when adding a `.version(N, …)` step; a test checks they match. Option hooks read through `useOptionStoreQuery`, which suspends until `ReadinessService` reports every store at its latest version, and `OptionsService.get/set/update` wait the same way. `OptionsReadinessGate` only decides what a root shows while the upgrade runs or after it fails.
- See `package.json` for available scripts and dependencies
