# Agent context: app/web

## Purpose

Angular SPA for video discovery and playback using Kazumi rules. Requires the Danmaku Anywhere browser extension for scraping and danmaku features.

## Tech stack

- Angular 21+ with standalone components
- PrimeNG + Tailwind CSS for UI
- TanStack Angular Query for data fetching
- Signals + NgRx Signals for state management
- Artplayer for video playback
- Dexie for client-side storage
- openapi-fetch for Bangumi API

## Conventions

- Standalone components only (no NgModules, `standalone: true` is implied)
- Use `input()`/`output()` functions, not decorators
- Use signals and `computed()` for state
- `ChangeDetectionStrategy.OnPush` always
- Native control flow (`@if`, `@for`, `@switch`), not structural directives
- `injectQuery`/`injectMutation` from TanStack Query
- `inject()` function, not constructor injection
- Reactive forms, not template-driven
- Do NOT use `ngClass`/`ngStyle` — use `class`/`style` bindings
- Use `providedIn: 'root'` for singleton services

## Gotchas

- Requires the browser extension to be installed for scraping features
- Uses **Vitest** via `@angular/build:unit-test` (`pnpm test:ng` runs `ng test`; `tsconfig.spec.json` types are `vitest/globals`). There is no Karma/Jasmine.
- Zoneless change detection: in specs prefer `await fixture.whenStable()` over `fixture.detectChanges()` loops; signal reads are synchronous.
- See `package.json` for available scripts and dependencies

## Testing

- **Unit/component specs** use `provideTestApp()` from `src/app/shared/testing/provide-test-app.ts`: zoneless CD, noop animations, a fresh per-spec `QueryClient` (no retries/stale), PrimeNG theme, and the fake backend bound to the abstract seam tokens (`ExtensionDetector`, `ExtensionMessenger`, `KazumiCatalog`, `BANGUMI_CLIENT`/`BANGUMI_NEXT_CLIENT`, `FakeBackendRecorder`). Specs never hit the network. `test-utils.ts` has `makeShowCard`, `byTestId`, and `harnessClick`.
- Every test file has a 3-6 line JSDoc header after imports, before the first `describe`/`it`, naming what is exercised and asserted.
- The deterministic fake backend lives in `src/app/core/backend/` (`implementations/` + `fixtures/`). Run the explorable build with `pnpm demo` (port 4300); e2e uses `pnpm serve:e2e` (port 4173).

## Web e2e doctrine - assert real behavior, no mock theatre

e2e specs live in `e2e/specs/**` and run against the **fake-backend build** (`ng serve --configuration fake`, port 4173) via `playwright.config.ts`. The fake backend is deterministic and in-memory; e2e exercises the *real* Angular app (lane store, components, theme, query layer). Only the extension/Bangumi/kazumi seam is faked.

**The deciding question for any spec:** if you removed every UI assertion, would it still pass on store state alone? If yes, it is not an e2e test, move it to a `provideTestApp` component spec. State-only assertions in a Playwright costume cost ~100x and catch less.

Every spec asserts at least one **user-visible signal** (rendered lane DOM `[data-testid="lane"][data-kind=...]`, a lane transition, the theme class on `<html>`, the mounted player). The debug overlay's `debug-*` testids and `debug-store-json` are **complementary ground truth**, they pin the lane store so a UI bug cannot mask a state bug. They do not replace the UI assertion.

**Onboarding:** loading `/` redirects to `/onboarding`, which auto-completes (seeds kazumi rules) and navigates back to the lane. Use `bootApp(page)` to wait for the shell and first trending card. Kazumi search/playback need the seeded rules loaded, which the onboarding session does not refetch, so use `bootAppWithKazumiRules(page)` (boots then reloads once, the state a returning user lands in).

**Baselines (enforced by `e2e/setup/fixtures.ts`):** any `console.error` fails the test (opt out via one-line-justified `test.use({ expectedConsoleErrors: [...] })`); any network request to a non-allow-listed origin fails the test (allow-list is `localhost`/`data:`/`blob:`/`about:` only, a hit to `api.bgm.tv` means fake mode leaked, which is a bug, not an allow-list gap).

**POMs** live in `e2e/pom/`, composed under `Shell`. Add a method rather than reaching for a selector in a spec. Prefer accessible role/label locators; use `data-testid` as the stable, i18n-proof fallback.
