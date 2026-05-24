# Agent context: packages/danmaku-anywhere/e2e

This is the **baseline doctrine** for end-to-end tests. Future e2e PRs are reviewed against it.

## Test taxonomy

Three layers, in increasing cost and fragility:

- **unit** — `*.test.ts` next to the source. In-process, no browser. Pure logic, single class/function.
- **package-integration** — `__tests__/*.test.ts`. Still in-process. Multi-class flows inside one package (service + repo + store).
- **e2e** — `e2e/specs/**`, Playwright, real extension loaded into Chromium. Answers exactly one question: **"did the user see X in the UI?"**

The deciding question for any spec: **if you removed every UI assertion, would the test still pass on data alone?** If yes, it isn't e2e — move it down a layer. State-only assertions wearing a Playwright costume cost ~100× a unit test and catch less.

## Every e2e spec asserts at least one user-visible signal

User-visible means observable from the rendered DOM, a download, or a navigation. Concretely:

- toast text + severity (via `popup.toast`)
- dialog title/body (via `popup.dialog`)
- rendered DOM: `commentElements()`, tree-item visibility, count text, list item presence
- download payload (`page.waitForEvent('download')`)
- URL / page transition

State assertions (`da.season.get(...)`, `da.episode.get(...)`, mount mirror) **complement** UI assertions — they pin down ground truth so a UI bug can't mask a data bug. They do not replace UI assertions. A regression that breaks the toast but leaves the DB correct should fail an e2e test, not pass it.

The standard shape:

```
1. Seed the DB / profile (via dev API)
2. Drive the UI (popup click, search submit, video event)
3. Assert UI: at least one user-visible signal
4. Assert state: ground truth in DB / chrome.storage (optional but encouraged)
```

## Comment rules

### Header JSDoc
3–6 lines, placed immediately after imports, before the first `test()` / `describe()`. Name what's exercised and what's asserted. No design-doc essays. No restating the test body step by step.

### Inside the test body / POMs / setup files
Default: **no comments.** Add one only when removing it would lead the next reader to file a wrong PR. The bar is "this would cost an hour of debugging if you didn't know." Examples that earn their keep:

- `fixtures.ts` eager watcher attach — explains a Playwright timing footgun (workers register before fixtures resolve).
- Anything that documents a known race, a library bug, a CDP delivery quirk, or an envelope constraint (MUI portal behavior, structuredClone limits, etc.).

Examples that do NOT earn their keep — delete on sight:

- Narration of what the next line does: `// Click the menu item` above `menu.click()`.
- Explanations of Playwright auto-wait, locator chaining, or `dispatchEvent` mechanics. Readers know.
- "We do X because Y is broken" without naming what Y is or when it can be removed.

### Don't restate WHAT
Well-named identifiers are the WHAT. Comment only the WHY, and only when WHY is non-obvious.

## Hacks to avoid

- **Dev-API methods that exist only to paper over a production race.** Fix the chain instead. The current `da.mount.waitForRegistration` is grandfathered; new equivalents need an explicit justification in the PR.
- **Parallel test-only mirror state** (e.g. `__daMountMirror`) must justify itself against asserting on the UI signal directly. Prefer the UI signal. Mirrors are acceptable when the UI signal is genuinely unobservable from Playwright (e.g. cross-frame state not reflected in DOM), but the burden of proof is on the mirror.
- **`IS_DA_E2E` branches in source.** The flag stays — `e2e` is another runtime env alongside `dev`/`preview`/`prod`, and using it sparingly is fine. But every branch in source needs a one-line comment naming why the e2e path differs.

## Baselines

These are enforced by `e2e/setup/fixtures.ts` and apply to every spec by default.

### Network strict-mode
Any HTTP request that isn't mocked by a per-spec route or covered by the project allow-list **fails the test**. Project allow-list covers `chrome-extension:`, `data:`, `blob:`, `about:`, and `*.invalid` hostnames.

To opt extra origins in:

```ts
test.use({ allowedNetworkOrigins: ['accounts.google.com'] }) // OAuth redirect — covered by separate auth test
```

One-line justification per entry. Prefer a per-spec mock over widening the allow-list.

### Console-error default-fail
Any `console.error` during the test body fails it. Patterns match by `includes` (string) or `.test` (RegExp) against the formatted line — the entry includes a `[sw]` / `[page <url>]` prefix and a trailing `(<url>:<line>:<col>)`, so patterns can target any of those parts.

To opt out:

```ts
test.use({ expectedConsoleErrors: [/SchemaValidationError: known stale fixture/] })
```

One-line justification per entry. Treat opt-outs as tech debt — leaving them unjustified means a real regression hides behind a "we always saw that one."

## Page Objects (POMs)

POMs live under `e2e/pom/`. The composed root is `Popup` (`e2e/pom/Popup.ts`); page-area POMs hang off it (`popup.mount`, `popup.search`, `popup.seasonDetails`, `popup.toast`, `popup.dialog`). `IntegrationPage` is standalone — it doesn't open via `chrome-extension://`.

Add methods to a POM rather than reaching into selectors from a spec. If a spec needs a one-off selector that isn't worth a POM method, add a one-line comment explaining why a method wasn't added.

### Locale-stable matchers
Toast text and dialog title/body are i18n-translated. Prefer `popup.toast.expectSuccess` / `expectError` (which scope by `data-severity`) over raw text matching. When asserting message text, use a regex that matches both locales — see `SeasonDetailsPage.expectCommentCount` (matches `条弹幕` and `comments`).

## Migration specs

Live under `e2e/specs/migration/`. They are slower than baseline specs (~10 to 30s each first-run, dominated by downloading the prior release on a cold `.e2e-cache/`) and only run when changes might affect persisted shape: chrome.storage option schemas, Dexie IndexedDB schema versions, provider config reshapes, etc.

### The swap mechanism

Launch a persistent Chromium context with the prior released build via `--load-extension`. Let it boot and write defaults. Then call CDP `Extensions.loadUnpacked` with the current build's path inside the SAME context. Both manifests embed `MIGRATION_EXTENSION_KEY`, so Chrome resolves them to the same extension ID. The bumped current manifest version (+99 on the build component) triggers Chrome's real update install path, which actually re-evaluates the SW against the new files and runs the upgrade pipeline.

`--load-extension` close + relaunch with a different path is NOT a valid swap: Chrome keeps the prior compiled SW bytecode and silently no-ops every migration. CDP `Extensions.loadUnpacked` is the only path that actually re-evaluates the SW. The launch helper passes `--enable-unsafe-extension-debugging` to unlock the CDP Extensions domain.

### user_data_dir must be a short path

Chrome's IDB / LevelDB silently breaks on Windows paths over `MAX_PATH` (260 chars). `testInfo.outputPath('userDataDir')` is too deep once Chrome adds its own per-origin subdir. Use `os.tmpdir()` for the user_data_dir or migrations will appear to never run because IDB never opens. This is a real Chrome quirk, not a test-only issue.

### Sourcing the prior release

`ensurePriorRelease(tag)` resolves the prior build in this order:

1. `DA_PRIOR_EXTENSIONS_DIR` env var pointing at a folder of pre-downloaded unpacked extensions (subdirs named after the version, e.g. `1.5.0/`). Skips the network. Useful for local iteration.
2. The on-disk cache at `.e2e-cache/prior-releases/<tag>/`.
3. Public HTTPS download from `github.com/{repo}/releases/download/{tag}/{asset}`. No auth required (the release asset is public). CI does not need a token.

The baseline tag, repo, and asset filename template live in `e2e/migration.config.json` so bumping the baseline doesn't require code changes. Bumping the baseline (e.g. after a new prod release) is a JSON edit and a fresh cache key derivation.

### Seed data

The smoke seeds state by driving v1.5.0's own popup UI from `e2e/poms/legacy/v1.5.0/MigrationLegacyPopup`. Two flows:

- `restoreBackup(jsonPath)` — uploads to `/options/backup`, writes `chrome.storage`.
- `importDanmaku(zipPath)` — uploads to `/mount`, writes IDB rows. v1.5.0's import auto-extracts zip files, so one zip can hold multiple danmaku files.

Fixtures are committed as binaries under `e2e/fixtures/migration/`:

- `backup.json.gz` — redacted chrome.storage backup.
- `danmaku.zip` — one representative danmaku export per provider type.

Regenerate with `scripts/prepareMigrationFixtures.mjs <backup.json> <export-root>`. The script strips API keys, auth headers, and user-identifying URLs; refuses to write if it can still detect anything resembling a secret.

### Asserting post-swap

Read state through a popup page (`chrome-extension://<id>/pages/popup.html`), not the service worker. The popup forces the new SW to wake and exercises RPC handlers, surfacing latent errors in the upgrade path. The swapped SW reference from Playwright may go stale.

Smoke assertions combine an error gate AND positive data integrity assertions. The error gate catches throwing migrations (`OptionsService` logs them, Dexie's `db.open()` rejects). Positive assertions catch silent corruption (a migration that returns `[]` or drops a field without throwing) since no error fires. Neither alone is sufficient. Assertions match seeded state by ID rather than byte-equality so a v22 to v25 migration that legitimately reshapes fields still passes; the test fails only when an entry goes missing or the upgrade explicitly errors.

### Helpers

- `ensurePriorRelease(tag)`: stages a prior release into `.e2e-cache/prior-releases/<tag>/extension/`, injecting the test key. Honors `DA_PRIOR_EXTENSIONS_DIR` for local sourcing.
- `ensureCurrentBuildForMigration()`: copies the current `build/` into `.e2e-cache/prior-releases/current-<workerSlot>/extension/`, injects the test key, bumps the manifest version.
- `launchExtension({ userDataDir, extensionPath })`: launches a persistent context with the prior build via `--load-extension` and the CDP Extensions flag.
- `swapExtension(launched, { extensionPath })`: swaps to the current build via CDP `Extensions.loadUnpacked` in the same context.

Vendored POMs for the prior release's UI live under `e2e/poms/legacy/<version>/` and are frozen. Never share with current POMs since current UI evolves.
