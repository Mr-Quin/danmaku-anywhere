# Agent context: app/release-manager

## Purpose

A standalone, self-updating desktop app (Tauri 2) that downloads extension
release/preview builds from the `Mr-Quin/danmaku-anywhere` GitHub releases and
manages which cached build is the "active" unpacked folder loaded into
`chrome://extensions`. Linux only for v1, shipped as a self-contained AppImage.

It is versioned and released independently of the extension, with its own
self-update lifecycle. It consumes the extension's `v*`/`preview-*`/`nightly-*`
releases and publishes its own under the `release-manager-v*` tag namespace.

## Architecture

- `src/` React frontend (one screen). Talks to the backend over Tauri IPC via
  `invoke`; `src/api.ts` wraps the commands, `src/updater.ts` wraps the updater
  plugin. There is no HTTP server.
- `src-tauri/` is a two-crate Cargo workspace:
  - `core/` (`release-manager-core`): pure logic with no Tauri dependency
    (`github`, `cache`, `active`, `store`, `manager`, `types`, `error`). All
    fallible ops return `Result<T, RmError>`; `RmError` serializes to
    `{ kind, message }` (and `status` for `auth`), matching what the UI renders.
    Keeping this crate Tauri-free means its tests run without the webkit system
    libraries, which is the fast inner loop.
  - the app crate (`release-manager`): Tauri commands (thin wrappers over the
    manager behind a `tokio::sync::Mutex`), plugin registration, and startup
    wiring in `src/lib.rs`.

## Commands (JS `invoke`)

`get_state`, `list_releases` (paged, 100 per page), `download_build`,
`set_active`, `remove_build`. There is no GitHub token: the repo is public and
unauthenticated requests suffice.

## Toolchain prerequisites

- Rust stable (via rustup).
- Linux system libraries for a Tauri 2 build: webkit2gtk 4.1 dev, gtk3 dev,
  librsvg dev, an appindicator dev package, and `patchelf`. `Xvfb` is needed for
  the headless boot smoke.
- Local AppImage bundling: on distributions whose system libraries use the RELR
  relocation format (a `.relr.dyn` section, e.g. recent Fedora), set
  `NO_STRIP=1` for `tauri build`. linuxdeploy bundles an older `strip` that
  cannot parse that section and fails otherwise. The CI runner (ubuntu-22.04)
  does not need this.
- Host webkit vs bundled: the AppImage bundles the ubuntu-22.04 webkit and
  libwayland. On a much newer host the bundled libwayland can't negotiate EGL
  with the host compositor/Mesa, so the window fails to start. `main.rs`
  preloads the host libwayland and re-execs once (only when launched from the
  AppImage) to work around it. The bundled webkit still renders in software on
  newer GPUs, so it can feel sluggish; the real fix is to use the host webkit
  (ship rpm/deb, or a non-bundling AppImage), not done in v1.

## How to run

- Dev: `pnpm tauri dev` (root convenience: `pnpm release-manager`). Vite serves
  the frontend; Tauri opens the native window.
- There is deliberately **no `build` script**, so the root `pnpm -r build` skips
  this package. It still participates in the root `test`, `type-check`, and
  `lint:ci` sweeps via its own scripts.
- The app icon is set on the window at startup as well as bundled. GNOME Wayland
  ignores window-set icons and matches the installed `.desktop` file instead, so
  under `pnpm dev` there it shows a generic icon. The installed AppImage and X11
  desktops show the real icon.

## Tests

- `pnpm test` runs `cargo test -p release-manager-core` (the webkit-free unit
  tests plus the full-flow integration e2e in `core/tests/e2e_flow.rs`, which
  drives the manager against an in-process fake GitHub server and asserts real
  filesystem state). This is the primary agentic verification.
- The app crate compiles and boots only with the webkit libraries present. A
  headless boot smoke is `xvfb-run -a` the built debug binary with a throwaway
  `DA_RELEASE_MANAGER_DIR`.
- There is no WebDriver UI e2e: Fedora ships no `WebKitWebDriver` matching
  webkit2gtk-4.1, and the backend integration test already covers the behavior.

## Configuration seams (env, production defaults)

Read once at startup; no test backdoors.

- `DA_RELEASE_MANAGER_DIR` (default `~/.da-release-manager`)
- `DA_RELEASE_MANAGER_GITHUB_BASE` (default `https://api.github.com`)

Data dir layout:

```
<dataDir>/
  config.json            # mode 0600; { activeTag?, builds[] }
  cache/<tag>/           # an unzipped chrome build (contains manifest.json)
  cache/.tmp-<tag>/      # transient unzip staging, renamed atomically into place
  active/                # real dir holding a copy of the active build
```

## Active-folder swap (load-bearing invariant)

`set_active(tag)` makes `<dataDir>/active` a real directory and copies the chosen
`cache/<tag>/` build into it, replacing its previous contents in place. It is a
copy, never a symlink: a sandboxed (Flatpak) Chrome reads the picked folder
through a document portal that does not grant the symlink's target, so a
symlinked active folder fails with "File path cannot be resolved." Copying keeps
the loaded path stable across swaps and works for both native and Flatpak Chrome.
`remove_build` refuses to delete the currently active build.

## Self-update and signing

- `tauri-plugin-updater` checks the floating `release-manager-latest` release's
  `latest.json`. The minisign public key is embedded in `tauri.conf.json`.
- Release signing uses a minisign keypair generated with `pnpm tauri signer
  generate`. The private key and its password are CI secrets
  (`TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`); never
  commit them.

## Release flow

Push a `release-manager-v<version>` tag (or run the workflow manually). CI builds
and signs the AppImage and creates a draft release with `latest.json`. A human
publishes the draft; publishing promotes `latest.json` onto the floating
`release-manager-latest` release that the updater polls. The first install is
manual (download the AppImage from the release); self-update covers every
version after that.
