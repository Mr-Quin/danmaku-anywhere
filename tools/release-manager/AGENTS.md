# Agent context: tools/release-manager

## Purpose

Local dev-only utility. A Node backend (full filesystem access) serves a React
browser-tab UI that downloads extension release/preview builds from the
`Mr-Quin/danmaku-anywhere` GitHub releases and manages which cached build is the
"active" unpacked folder loaded into `chrome://extensions`.

This is a developer tool, not a shipped artifact.

## Dev-only rule

There is deliberately **no `build` script**. The root `pnpm build` runs
`pnpm -r build` and skips any package without a `build` script, so this tool
never enters a production build. It still participates in the root `test`,
`type-check`, `lint:ci` sweeps because it defines those scripts.

## How to run

- `pnpm start` builds the web bundle (`build:web`) then starts the Node server
  and opens the resolved URL in the browser.
- `pnpm dev` runs the Node server under `tsx watch` and Vite together; Vite
  proxies `/api` to the server.

## dataDir

Resolved once at startup from `DA_RELEASE_MANAGER_DIR`, defaulting to
`~/.da-release-manager`. It is not runtime-mutable. Layout:

```
<dataDir>/
  config.json            # mode 0600; { githubToken?, activeTag?, builds[] }
  cache/<tag>/           # an unzipped chrome build (contains manifest.json)
  cache/.tmp-<tag>/      # transient unzip staging, renamed atomically into place
  active/                # real dir holding a copy of the active build
```

The token never leaves the server in cleartext: `getState` exposes
`hasToken: boolean`, never the raw token.

## Chrome swap behavior

`setActive(tag)` makes `<dataDir>/active` a real directory and copies the chosen
`cache/<tag>/` build into it, replacing its previous contents in place. The user
loads `<dataDir>/active` once via "Load unpacked" and clicks reload after each
swap to pick up the new build.

The active folder is copied rather than symlinked because a sandboxed (Flatpak)
Chrome reads the picked folder through a document portal that does not grant the
symlink's target, so a symlinked active folder fails with "File path cannot be
resolved." Copying keeps the loaded path stable across swaps and works for both
native and Flatpak Chrome. The copy source is the local cache, so swapping never
re-downloads.

## Layout

- `src/core/` pure, Result-based logic with no HTTP/UI imports
  (`types`, `github`, `store`, `cache`, `active`, `manager`).
- `src/server/` bare Hono + `@hono/node-server`, bound to `127.0.0.1` only,
  fixed default port with fallback.
- `src/web/` React + Vite, one screen, no component library.
- `test/` Vitest over the core.

## Conventions

- All fallible core ops return `Result<T, E>` from `@danmaku-anywhere/result`.
- `removeBuild` refuses to delete the currently active build; set another build
  active first.
- See `package.json` for available scripts and dependencies.

## Known limitations

- The releases list shows the most recent 100 releases (no pagination).
  Acceptable for a dev tool that only wants recent builds. Cached builds that
  age out of that window still render so they can be set active or removed.
