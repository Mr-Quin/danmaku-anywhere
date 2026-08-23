---
name: verifying-changes
description: Use after changing extension code, to prove it works: which test tier to run, the red-before-green rule, and what to record in the PR test plan. Start here, then branch to `browser-verify` or `e2e-spec` as needed.
---

# verifying-changes

The entry point for "I changed something, now show that it works."

Verification here is not a report you write. It is **a spec that failed before your change and
passes after it**, plus the commands you actually ran. An agent that narrates "verified in
browser" produces output indistinguishable from one that never opened a browser, which is why the
loop below is built around artifacts instead of claims.

## The loop

1. **Know what you're asserting?**
   - No: explore first with `browser-verify` (headless Chromium, extension loaded, dev-API
     seeding). Lift selectors with `generate-locator` rather than retyping them.
   - Yes: skip straight to the spec.
2. **Write the spec** as a scratch file under `e2e/specs/.scratch/` (gitignored, skipped by the
   spec lint). See `e2e-spec` for the rules that get specs bounced in review.
3. **Watch it go red** against the build *without* your change. A spec that passes both ways
   asserts something other than what you fixed.
4. **Make it green**, then graduate it: move the file into `e2e/specs/<area>/`.
5. **Run the right tier** (below) and record what you ran.

Refactors are the honest exception to step 3: behavior deliberately did not change, so the spec
goes green immediately. Do not weaken an assertion to manufacture a red.

## Which tier to run

From `packages/danmaku-anywhere`:

```bash
pnpm lint                # tsc + biome + the spec theatre lint
pnpm test:e2e:changed    # inner loop: specs you edited
pnpm test:e2e:smoke      # ~7s band: install, mount, search
pnpm test:e2e            # before pushing: whole suite, ~3 min headless
pnpm test:e2e:ui         # human only: Playwright UI mode, needs a display
```

Specs run headless by default; `DA_HEADED=1` brings back a visible window.

The full suite is ~1.8 minutes, so **run it before pushing**. Anything cleverer buys seconds and
risks missing a regression.

`--only-changed` selects on changed *spec files*. Specs load a built artifact rather than
importing product source, so editing a content script selects **nothing**. Never treat tier 1 as a
safety net for a product change.

Unit and package tests: `pnpm --filter <package> test`, or
`pnpm --filter '...[origin/master]' test` for a cross-cutting change.

## Getting a build without your change

For step 3, when the fix is already written:

```bash
git worktree add ../da-base $(git merge-base HEAD origin/master)
cd ../da-base && pnpm install --frozen-lockfile && pnpm build:packages
cd packages/danmaku-anywhere && VITE_DA_ENV=e2e pnpm run build
```

About 35s of building, measured. Copy the spec in, watch it fail, throw the worktree away.

## What to record

In the PR's Test plan, one line each. This is a record of what you did, not a second gate.

- `lint`: pass or fail
- tests: the scope you ran and the result
- e2e: which specs ran, or skipped with a one-line reason
- red before green: the spec you added and that you saw it fail first, or why the change is a
  refactor with no natural red

## Gotchas that waste a loop

- **The build must match the tree.** `globalSetup` refuses a stale or wrong-env `build/`, and
  `pnpm run verify:explore` repairs it. If a spec behaves impossibly, check that first.
- **Sibling worktrees exist.** Use absolute paths; a relative `cd` can land you in another
  checkout and your edits will appear to vanish.
- **Extensions need `build/`**, not `dev/chrome`. The latter is the human's `pnpm dev:browser`
  lane and the agent never touches it.

## Canonical doctrine

`packages/danmaku-anywhere/e2e/AGENTS.md` owns the e2e rules and auto-loads when you work in that
directory. This skill is the entry point; that file is the authority.
