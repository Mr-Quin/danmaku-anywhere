---
name: preview-build
description: Use when you need to load a specific published preview/nightly extension build into the agent's MCP browser by run-number, branch name, or tag. Faster than rebuilding locally when you only want to exercise an existing artifact.
---

# preview-build

Resolve a GitHub release published by CI (nightly or branch-preview), download its Chrome zip, expand to `.tmp/`, and `install_extension` it via the `chrome-devtools-ext` MCP. For active HMR development use `browser-verify` instead.

## Prerequisites

- `gh` CLI authenticated against this repo
- `chrome-devtools-ext` MCP (see `browser-verify` for install)
- A shell with `unzip` (macOS/Linux/git-bash) or `Expand-Archive` (PowerShell)

If any are missing, stop and tell the human.

## 1. Resolve the release

**By nightly run-number** (the `(<BUILD>)` in the title):
```bash
gh release list --limit 50 --json tagName,name \
  --jq '.[] | select(.name | test("\\(<BUILD>\\)$")) | .tagName'
```

**By branch:**
```bash
gh release view preview-branch-<branch-slug> --json tagName,assets,name
```

**Latest nightly:**
```bash
gh release list --limit 5 --json tagName,name,createdAt \
  --jq 'map(select(.name | startswith("Preview Build nightly-"))) | sort_by(.createdAt) | last | .tagName'
```

Substitute `<BUILD>` / `<branch-slug>` at the call site.

## 2. Download + expand

Both shells end with an `unpacked/` directory under `.tmp/` (gitignored).

**Unix / git-bash:**
```bash
TAG=<tag from step 1>
ASSET=$(gh release view "$TAG" --json assets --jq '.assets[] | select(.name | endswith("-chrome.zip")) | .name')
DEST=.tmp/preview-$TAG
mkdir -p "$DEST"
gh release download "$TAG" --pattern "$ASSET" --dir "$DEST"
unzip -q "$DEST/$ASSET" -d "$DEST/unpacked"
```

**PowerShell** (escape the inner double-quotes; PowerShell strips unescaped ones before passing to native exes):
```powershell
$TAG = '<tag from step 1>'
$ASSET = gh release view $TAG --json assets --jq '.assets[] | select(.name | endswith(\"-chrome.zip\")) | .name'
$DEST = ".tmp/preview-$TAG"
New-Item -ItemType Directory -Force -Path $DEST | Out-Null
gh release download $TAG --pattern $ASSET --dir $DEST
Expand-Archive -Path "$DEST/$ASSET" -DestinationPath "$DEST/unpacked" -Force
```

## 3. Load into the MCP browser

```
install_extension(<absolute path to the unpacked dir>)
```

Resolve the absolute path from the current working directory (`pwd` / `Get-Location`); don't embed a host-specific prefix.

The dev API (`globalThis.__da`) is NOT present in these builds; nightly tags ship prod, and `attachDevApi` is gated by `!IS_DA_PROD`. Seed state via `chrome.storage.set` directly.

## 4. Tear down

```
uninstall_extension(<id from list_extensions>)
```

Close lingering `chrome-extension://<id>/...` tabs first.

## Gotchas

- **Build numbers are not stable across forks.** The parenthetical in the title is this repo's GitHub Actions `run_number`.
- **Branch-preview release tags get overwritten** by new pushes. Grab the asset immediately if bisecting; only nightly tags are stable.
- **The Firefox zip is not loadable in Chromium.** Pick the `-chrome.zip` asset.
