---
name: browser-verify
description: Use when an extension change needs agentic verification in a real browser — content scripts, popup UI, network calls, fonts, console errors. Complements (does not replace) human eyeball verification via `pnpm dev:browser`.
---

# browser-verify — agentic browser verification

Drives Chrome via the `chrome-devtools-ext` MCP. Faster than Playwright e2e, gives the agent a real navigate → inspect → adjust loop. **Not a substitute for `pnpm dev:browser`** — that one is for human eyes. This one is for the agent to self-check changes without bothering the human.

## 0. Setup check

Confirm tools `mcp__chrome-devtools-ext__*` are available in this session. If not, stop and ask the user to install the MCP:

```bash
claude mcp add --scope user chrome-devtools-ext -- npx chrome-devtools-mcp@latest --isolated --categoryExtensions=true
```

If `claude mcp add` errors on the flag, paste under `mcpServers` in `~/.claude.json`:

```json
"chrome-devtools-ext": {
  "command": "npx",
  "args": ["chrome-devtools-mcp@latest", "--isolated", "--categoryExtensions=true"]
}
```

Then `/mcp reload` (or restart Claude). Wait for the user to confirm before continuing.

## 1. Choose the build to verify

| Goal | Build |
|---|---|
| Quick iteration during implementation | `dev/chrome` (already populated by `pnpm dev:browser`) |
| Final verification before committing | `build/` from a fresh `pnpm build` |
| Anything needing shadow-root access | `VITE_DA_ENV=e2e pnpm build` (controller's shadow opens) |

```bash
cd packages/danmaku-anywhere && pnpm build
```

## 2. Install + navigate

```
mcp__chrome-devtools-ext__install_extension(<absolute path to build dir>)
mcp__chrome-devtools-ext__navigate_page(<test URL>)
```

If the controller needs a mount profile to activate, seed before navigating:

```js
mcp__chrome-devtools-ext__evaluate_script(`
  await chrome.storage.local.set({
    xpathPolicy: { data: [INTEGRATION], version: LATEST_INTEGRATION_POLICY_VERSION },
  })
  await chrome.storage.sync.set({
    mountConfig: { data: [CONFIG], version: LATEST_MOUNT_CONFIG_VERSION },
  })
`)
```

The dev-API hatch `self.__da` is only present in `VITE_DA_ENV=e2e` builds — for prod/dev builds, write to `chrome.storage` directly as above. Poll `chrome.scripting.getRegisteredContentScripts` before navigating to confirm the script registered.

## 3. Inspect

| Need | Tool |
|---|---|
| Visual confirm | `take_screenshot({ filePath })` |
| DOM / a11y tree | `take_snapshot()` |
| Run JS in page or SW | `evaluate_script({ ..., serviceWorkerId })` |
| Console errors (CORS, CSP, MV3) | `list_console_messages({ types: ['error', 'warn'] })` |
| Network (fonts, fetches, status) | `list_network_requests({ resourceTypes: [...] })` |

## 4. After HMR / rebuild

`dev/chrome` bakes the Vite port in at build time. If `dev:browser` restarted with a new port, the extension in the MCP browser is stale:

```
mcp__chrome-devtools-ext__uninstall_extension(<id>)
mcp__chrome-devtools-ext__install_extension(<path>)
```

For a fresh `pnpm build`, `reload_extension(<id>)` is enough.

---

## Notes (only read when relevant)

### Shadow DOM access

The controller's shadow root is `open` only in `VITE_DA_ENV=e2e` builds; prod and dev use `closed`. To inspect a closed shadow root:

- Build with `VITE_DA_ENV=e2e pnpm build`, OR
- Use CDP `Runtime.evaluate` via `evaluate_script` — the page's V8 context can reach a closed `shadowRoot` reference directly:

```js
document.getElementById('danmaku-anywhere-controller').shadowRoot.querySelector('...')
```

### Ground-truth font verification

`document.fonts.load(...)` only proves the woff2 reached the FontFaceSet, not that the browser painted with it. For "what font actually rendered," use CDP `CSS.getPlatformFontsForNode` (same source as DevTools' "Rendered Fonts" panel):

```js
const cdp = await page.context().newCDPSession(page)
await cdp.send('DOM.enable')
await cdp.send('CSS.enable')
await cdp.send('DOM.getDocument', { depth: -1, pierce: true })
const { result } = await cdp.send('Runtime.evaluate', { expression: '/* css selector */' })
const { nodeId } = await cdp.send('DOM.requestNode', { objectId: result.objectId })
const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
// fonts: Array<{ familyName, glyphCount, isCustomFont }>
```

The target element must have a layout box — push off-screen with `position:fixed; top:-9999px;` instead of `visibility:hidden`.
