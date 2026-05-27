---
name: e2e-spec
description: Use when about to write or modify a Playwright e2e spec under `packages/danmaku-anywhere/e2e/`. Points at the canonical doctrine and surfaces the load-bearing rules so the spec doesn't get bounced in review.
---

# e2e-spec

The source of truth is `packages/danmaku-anywhere/e2e/AGENTS.md`. It auto-loads when you're already working in that directory; this skill exists for the path where `da-dev` step 3 makes you *start* an e2e change from elsewhere. **Read AGENTS.md end-to-end before writing the first `test()`.** This file is the cheat sheet, not a replacement.

## The load-bearing rules (don't skip even if you skim AGENTS.md)

1. **Every spec asserts at least one user-visible signal.** UI-visible means rendered DOM, toast text + severity, dialog title/body, download payload, URL/page transition. State assertions (`da.season.get(...)`, mount mirror) complement UI assertions; they don't replace them.
2. **The deciding question:** if you removed every UI assertion, would the test still pass on data alone? If yes, it isn't e2e; move it to unit or package-integration. State-only specs in a Playwright costume cost ~100× a unit test and catch less.
3. **Standard shape:** seed via dev API → drive the UI → assert UI → optionally assert state.
4. **Locale-stable matchers.** Toast/dialog text is i18n-translated. Use `popup.toast.expectSuccess` / `expectError` (scoped by `data-severity`), not raw text. When you must match text, use a regex that matches both `en` and `zh`.
5. **POMs over selectors.** Add methods to a POM under `e2e/pom/` rather than reaching into selectors from a spec. If a one-off selector is genuinely not worth a POM method, leave a one-line comment explaining why.
6. **Header JSDoc on every spec:** 3–6 lines after imports, before the first `test()`. Names what's exercised and what's asserted. No design-doc essays, no step-by-step narration.
7. **Default to no comments inside the body / POMs.** The bar: "removing it would cost an hour of debugging." Restating the next line is not that bar.

## Baselines that fail tests silently if violated

These are enforced by `e2e/setup/fixtures.ts`; you don't opt in.

- **Network strict-mode.** Any HTTP request not mocked per-spec or covered by the project allow-list fails the test. Opt extras in via `test.use({ allowedNetworkOrigins: [...] })` with a one-line justification per entry. Prefer per-spec mocks.
- **Console-error default-fail.** Any `console.error` during the test body fails it. Opt out via `test.use({ expectedConsoleErrors: [/.../] })` with a one-line justification; treat opt-outs as tech debt.

## Anti-patterns AGENTS.md calls out (don't ship)

- **State-only assertions wearing a Playwright costume** (no UI signal asserted).
- **New dev-API methods that paper over a production race.** Fix the chain instead. `da.mount.waitForRegistration` is grandfathered; new equivalents need explicit PR justification.
- **Parallel test-only mirror state** when the same signal is observable via UI. Mirrors are acceptable only when the UI signal is genuinely unobservable from Playwright (e.g. cross-frame state not reflected in DOM); burden of proof on the mirror.
- **Uncommented `IS_DA_E2E` branches in source.** The flag stays, but every branch needs a one-line comment naming why the e2e path differs.

## Migration specs are a separate beast

If you're writing under `e2e/specs/migration/`, AGENTS.md has a dedicated section. Two things to internalize before starting:

- The swap mechanism uses CDP `Extensions.loadUnpacked` in a persistent context. Close-and-relaunch is NOT a valid swap (Chrome keeps prior compiled SW bytecode).
- `user_data_dir` must be a short path (`os.tmpdir()`), not `testInfo.outputPath('userDataDir')`. Chrome's IDB silently breaks on Windows paths over `MAX_PATH` (260 chars).

Don't write a migration spec from this cheat sheet alone; read AGENTS.md's migration section in full.

## Authoring loop

1. Read `packages/danmaku-anywhere/e2e/AGENTS.md`.
2. Find the closest existing spec under `e2e/specs/` and use it as a template. POM usage, seeding patterns, assertion shape.
3. Use `browser-verify` while authoring to find selectors, confirm timing, and capture the event sequence. The dev API (`globalThis.__da.describe()`) lists what's available for seeding.
4. Write the spec.
5. Run it: `cd packages/danmaku-anywhere && pnpm test:e2e -- <spec>`. Iterate.
6. Before pushing: full e2e run (`pnpm test:e2e`); the suite is the load-bearing verification per `da-dev` step 4.

## When the AGENTS.md doctrine and an AI reviewer disagree

AGENTS.md wins. See `reviewing-ai-feedback`. "suggested change violates a project convention" is a known false-positive pattern. Decline citing the rule.
