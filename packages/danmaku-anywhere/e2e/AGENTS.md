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

### Network strict-mode (DA-503)
Any HTTP request that isn't mocked by a per-spec route or covered by the project allow-list **fails the test**. Project allow-list covers `chrome-extension:`, `data:`, `blob:`, `about:`, and `*.invalid` hostnames.

To opt extra origins in:

```ts
test.use({ allowedNetworkOrigins: ['accounts.google.com'] }) // OAuth redirect — covered by separate auth test
```

One-line justification per entry. Prefer a per-spec mock over widening the allow-list.

### Console-error default-fail (DA-502)
Any `console.error` during the test body fails it. Patterns match by `includes` (string) or `.test` (RegExp) against the formatted line — the entry includes a `[sw]` / `[page <url>]` prefix and a trailing `(<url>:<line>:<col>)`, so patterns can target any of those parts.

To opt out:

```ts
test.use({ expectedConsoleErrors: [/SchemaValidationError: known stale fixture/] })
```

One-line justification per entry. Treat opt-outs as tech debt — leaving them unjustified means a real regression hides behind a "we always saw that one."

## Page Objects (POMs)

POMs live under `e2e/pom/`. The composed root is `Popup` (`e2e/pom/Popup.ts`); page-area POMs hang off it (`popup.mount`, `popup.search`, `popup.seasonDetails`, `popup.toast`, `popup.dialog`). `IntegrationPage` is standalone — it doesn't open via `chrome-extension://`.

Add methods to a POM rather than reaching into selectors from a spec. If a spec needs a one-off selector that isn't worth a POM method, add a one-line comment explaining why a method wasn't added.
