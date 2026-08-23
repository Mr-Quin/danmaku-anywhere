---
name: browser-verify
description: Use when an extension change needs exploration in a real browser — finding selectors, watching a flow, reading console or network. Drives the agent's own headless Chromium through the Playwright CLI. Exploration only; the verification that counts is a spec (see `e2e-spec`).
---

# browser-verify — exploring the extension in a real browser

This skill is for the part of the loop where you **don't yet know what to assert**: finding a
selector, watching what a flow actually does, reading a console error, checking a request.

It is not the verification. Verification is a spec that went red before it went green, on the same
harness CI runs. See `e2e-spec`. If you already know what you're checking, skip this skill and
write the spec.

## 0. Preflight

```bash
cd packages/danmaku-anywhere && pnpm run verify:explore
```

This rebuilds `build/` if it is stale, hard-fails if chromium is missing, writes a ready CLI
config, and prints the exact commands with a fresh session name. Copy them from its output.

The config points at the same chromium binary the e2e suite uses, so anything you observe here
behaves the same way inside a spec.

## 1. Drive it

```bash
npx -y @playwright/cli@0.1.18 -s=<session> open --persistent --config=<config> about:blank
npx -y @playwright/cli@0.1.18 -s=<session> goto <url>
npx -y @playwright/cli@0.1.18 -s=<session> snapshot
npx -y @playwright/cli@0.1.18 -s=<session> click <ref>
npx -y @playwright/cli@0.1.18 -s=<session> close
```

`snapshot` returns the accessibility tree with a `ref` per element. Feed a ref to `click`,
`fill`, `hover`, or `generate-locator`.

The extension's own pages work like any other URL: `goto chrome-extension://<id>/pages/popup.html`.
Get `<id>` from the service worker (below).

## 2. Turn what you found into spec code

```bash
npx -y @playwright/cli@0.1.18 -s=<session> generate-locator <ref>
# -> getByRole('tab', { name: '搜索番剧' })
```

Paste that straight into the spec. Don't retype a selector from a screenshot; that is how a spec
ends up asserting something adjacent to what you actually saw.

## 3. Seed state through the dev API

`globalThis.__da` is attached on the service worker for every non-prod env. Reach it the same way
`e2e/setup/fixtures.ts` does:

```bash
npx -y @playwright/cli@0.1.18 -s=<session> run-code \
  "async page => page.context().serviceWorkers()[0].evaluate(() => globalThis.__da.describe())"
```

Namespaces: `providerConfig`, `storage`, `extensionOptions`, `runtime`, `season`, `episode`,
`bookmark`, `mount`. Each goes through the same write and invalidation pipeline production uses,
so subscribers re-render correctly. Raw `chrome.storage` writes skip that and the UI may not update.

## 4. Inspect

| Need | Command |
|---|---|
| Accessibility tree | `snapshot` |
| Search the snapshot | `find <text>` |
| Console | `console [min-level]` |
| Network | `requests`, `request <n>`, `response-body <n>` |
| Mock a request | `route <pattern>` |
| Screenshot | `screenshot` |
| Arbitrary Playwright | `run-code "async page => ..."` |

`run-code` gives you the real `page`, so `page.context()` reaches the whole context: service
workers, CDP sessions, other tabs.

## 5. After a rebuild, reload in place

```bash
npx -y @playwright/cli@0.1.18 -s=<session> run-code \
  "async page => { const cdp = await page.context().browser().newBrowserCDPSession(); return cdp.send('Extensions.loadUnpacked', { path: '<abs>/packages/danmaku-anywhere/build' }); }"
```

This is the same CDP call `e2e/setup/swapExtension.ts` uses, and the preflight config already
passes `--enable-unsafe-extension-debugging` to unlock it. `chrome.runtime.reload()` is not a
substitute: it kills the worker and it does not come back.

## 6. Tear down

```bash
npx -y @playwright/cli@0.1.18 -s=<session> close
npx -y @playwright/cli@0.1.18 close-all   # if sessions were left behind
```

A leftover session holds a browser process and a profile directory.

---

## Notes

### Profiles are disposable on purpose

Use the fresh session name the preflight prints, every run. Reusing one carries state between
runs, and a wedged extension survives into the next session as a service worker that never
appears. If you must reuse a session, `delete-data` clears its profile.

### Working directory

The CLI writes `.playwright-cli/` (snapshots, console logs, screenshots, video, traces) into
whatever directory you run it from. It is gitignored at the repo root and in the extension
package.

### Rendered fonts

`document.fonts.load(...)` only proves a font reached the FontFaceSet, not that it painted. For
what actually rendered, go through CDP:

```js
const cdp = await page.context().newCDPSession(page)
await cdp.send('DOM.enable'); await cdp.send('CSS.enable')
const { root } = await cdp.send('DOM.getDocument', { depth: -1 })
const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#probe' })
const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
```

The target element needs a layout box: push it off-screen with `position:fixed; top:-9999px`
rather than `visibility:hidden`.

### The human's dev browser is separate

`pnpm dev:browser` opens the human's Chrome against `dev/chrome` with HMR. That is a different
lane and the agent does not touch it. Everything here runs off `build/`.
