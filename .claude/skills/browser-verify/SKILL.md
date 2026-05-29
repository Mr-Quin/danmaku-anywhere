---
name: browser-verify
description: Use when an extension change needs agentic verification in a real browser — content scripts, popup UI, network calls, fonts, console errors. Spawns the agent's own Chrome via the chrome-devtools-ext MCP. Complements (does not replace) human-eye verification via `pnpm dev:browser`.
---

# browser-verify — agentic browser verification

The agent gets its **own** Chrome (spawned by the MCP, isolated profile) so it can navigate, inspect, screenshot, and reload without interfering with the human's `dev:browser` session. Both browsers load from the **same** `packages/danmaku-anywhere/dev/chrome/` build dir, so Vite's HMR feeds both at once.

## 0. Setup check

The MCP is declared as a project server in `.mcp.json` at the repo root (name `chrome-devtools-ext`, args `--isolated --categoryExtensions=true`). Confirm tools `mcp__chrome-devtools-ext__*` are available in this session. If they are, go to step 1.

If they are not available:

1. Approve the project server if Claude prompts for it (servers from `.mcp.json` need a one-time approval; reset with `claude mcp reset-project-choices`).
2. Give it a browser binary. The MCP is Puppeteer-based and launches Chrome directly over a pipe connection (required by `--categoryExtensions`; `--browserUrl` / `--wsEndpoint` do not work for the extension tools). `.mcp.json` passes `--executablePath=${CHROME_DEVTOOLS_EXECUTABLE:-}`: leave the var unset to use system Chrome (stable channel), or set `CHROME_DEVTOOLS_EXECUTABLE` to a Chrome/Chromium executable. Playwright's Chromium matches the e2e suite and works:

   ```bash
   pnpm exec playwright install chromium
   # export CHROME_DEVTOOLS_EXECUTABLE=~/.cache/ms-playwright/chromium-<rev>/chrome-linux64/chrome
   ```

   Set the var in your shell env (e.g. `~/.zshenv`) so Claude inherits it, then do a full restart. A `/mcp` reload alone will not pick up a newly exported var. Wait for confirmation before continuing.

## 1. Dev loop (default during implementation)

Prereq: `pnpm dev:browser` is running. Vite is writing to `packages/danmaku-anywhere/dev/chrome/`.

```
install_extension(<absolute path to packages/danmaku-anywhere/dev/chrome>)
navigate_page(<test URL>)
```

The agent's Chrome now runs the same source the human is looking at. When code changes, Vite rewrites the bundle and both browsers pick it up. If the SW gets stale (manifest change, major refactor, lost message channel) call `reload_extension(<id>)` to nudge it.

If the state machine needs seeded data (providers toggled, mount profile, custom episodes), prefer the **dev API** over raw `chrome.storage` writes. `globalThis.__da` is attached for every non-prod env — `dev`, `preview`, and `e2e` (`background/index.ts` calls `attachDevApi` when `!IS_DA_PROD`). It exposes 8 namespaces — `providerConfig`, `storage`, `extensionOptions`, `runtime`, `season`, `episode`, `bookmark`, `mount` — each going through the same write + invalidation pipeline the production code uses, so subscribers (React Query, Zustand) re-render correctly. Run from the SW context via `evaluate_script({ serviceWorkerId })`:

```js
await __da.providerConfig.toggle('builtin:dandanplay', false)
await __da.providerConfig.toggle('builtin:bilibili', false)
const list = await __da.providerConfig.list()  // verify
```

Discover methods with `__da.describe()` (returns `[{ name, methods: [{ name, ... }] }]`). Raw `chrome.storage.set` is a fallback for keys not exposed through the API; it works but skips the in-memory invalidation, so the UI may not pick up the change without a reload.

For mount-policy seeding specifically:

```js
await chrome.storage.local.set({
  xpathPolicy: { data: [INTEGRATION], version: LATEST_INTEGRATION_POLICY_VERSION },
})
await chrome.storage.sync.set({
  mountConfig: { data: [CONFIG], version: LATEST_MOUNT_CONFIG_VERSION },
})
```

Poll `chrome.scripting.getRegisteredContentScripts` before navigating to confirm registration.

## 2. Build verify (final pass before /review)

For runtime behavior that depends on prod-mode behavior (minified bundle, prod-only paths, no HMR client):

```bash
cd packages/danmaku-anywhere && pnpm build
```

Then:

```
uninstall_extension(<dev id>)
install_extension(<absolute path to packages/danmaku-anywhere/build>)
```

Same MCP browser, fresh artifact. For shadow-root introspection use `VITE_DA_ENV=e2e pnpm build` — the controller's shadow root opens in e2e builds only.

## 3. Inspect

| Need | Tool |
|---|---|
| Visual confirm | `take_screenshot({ filePath })` |
| DOM / a11y tree | `take_snapshot()` |
| Run JS in page or SW | `evaluate_script({ ..., serviceWorkerId })` |
| Console errors | `list_console_messages({ types: ['error', 'warn'] })` |
| Network requests | `list_network_requests({ resourceTypes: [...] })` |

Screenshots go to `.tmp/<topic>-<n>.png` (gitignored). Never commit them to the repo and never put them under `.claude-verify/`. There is no agentic path to attach them to PRs or ClickUp tasks; the file just stays in `.tmp/` for the human to view locally if needed.

## 4. Tear down when done

Always close the MCP browser at the end of a verification pass — otherwise a Chromium instance lingers, holding the Vite HMR socket and a `dev/chrome` filesystem lock until the Claude session exits.

```
uninstall_extension(<id>)
list_pages()  // close any chrome-extension://<id>/... tabs left open
close_page(...)  // for each non-blank page
```

When switching dev → build verify, also close any open `chrome-extension://<dev id>/...` tabs *before* the uninstall — those navigations become dead URLs once the extension is gone.

---

## Notes (read when relevant)

### Shadow DOM access on prod/dev builds

The controller's shadow root is `closed` outside `VITE_DA_ENV=e2e`. To inspect a closed shadow root, use `evaluate_script` — the page's V8 context can dereference the shadowRoot directly:

```js
document.getElementById('danmaku-anywhere-controller').shadowRoot.querySelector('...')
```

### Ground-truth font verification

`document.fonts.load(...)` only proves the font reached the FontFaceSet, not that the browser actually painted with it. For what *rendered*, use CDP `CSS.getPlatformFontsForNode` (same source as DevTools' "Rendered Fonts" panel) via `evaluate_script`:

```js
const cdp = await page.context().newCDPSession(page)
await cdp.send('DOM.enable')
await cdp.send('CSS.enable')
const { result } = await cdp.send('Runtime.evaluate', { expression: '/* selector */' })
const { nodeId } = await cdp.send('DOM.requestNode', { objectId: result.objectId })
const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
// fonts: Array<{ familyName, glyphCount, isCustomFont }>
```

The target element needs a layout box — push off-screen with `position:fixed; top:-9999px;` rather than `visibility:hidden`.
