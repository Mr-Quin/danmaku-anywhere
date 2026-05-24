# Info panel design

Date: 2026-05-23
Issue: [#369](https://github.com/Mr-Quin/danmaku-anywhere/issues/369) (episode display enhancement)
Status: design — ready for designer and engineering hand-off

## Background

Today the extension confirms match success via a toast in the bottom-left corner that disappears after a few seconds. Users on sites that do not display episode titles natively (many video portals) cannot tell whether the right episode is mounted. The settings popup carries this information but requires opening the floating action button (FAB), which is intrusive while watching and unreachable when a video element in a child iframe enters fullscreen.

Issue #369 lists three remedies:
1. Render match info next to a configurable XPath element on the host page (anchor display).
2. Provide a persistent lightweight floating panel showing the same info.
3. Expose match data via an API for userscripts.

This spec covers a refinement of (2): an in-video **info panel** that is purely informational. (1) and the related fullscreen-FAB problem are scoped to separate specs (see Follow-ups). (3) is out of scope per maintainer guidance (would require an embedded DSL since MV3 disallows `eval`).

## Goals

- Persistent, glanceable confirmation of what is matched and mounted on the current video.
- Survives video element changes and full screen because it lives in the same frame as the video.
- Reuses existing data sources (controller zustand store, `MediaInfo`) with no new business logic for matching.
- Stays cheap enough to render in any player frame on any page without a meaningful runtime cost.

## Non-goals

- No quick-action controls in the info panel. All actions remain the FAB's responsibility.
- No replacement of the FAB. FAB stays the primary control surface; info panel is a peer that does not subsume any FAB responsibility.
- No consolidation of `SkipButton` code into the info panel. SkipButton keeps its own owner and lifecycle.
- No support for fullscreen on a video whose frame is the top frame (the FAB usually still works there). Fullscreen-FAB-mirror is a separate follow-up.
- No userscript API.

## The split (context for follow-ups)

The original ask bundled three loosely related improvements. They are intentionally split:

| Track | Status | Notes |
|---|---|---|
| Info panel | This spec | In-video, info-only, in-player frame |
| Fullscreen FAB mirror | Follow-up | When a non-top frame enters fullscreen, mount a full mirror of the existing FAB (lazy-loaded on first fullscreen) inside the fullscreen frame, proxy actions back to the top-frame controller via RPC |
| Anchor display | Follow-up | Render match info in the host page DOM near a configurable XPath element |

Folding controls into the info panel was considered and rejected: it would reimplement FAB functionality without adding capability, and the fullscreen problem is better solved by relocating the FAB itself rather than building a parallel control surface.

## Designer-facing requirements

The visual treatment is the designer's. The following constraints are fixed.

### Spatial

- The panel is positioned **inside the bounding rect of the active `<video>` element**, not the viewport.
- Default attachment is the **left edge** of the video (so it does not block centered content).
- The panel is **draggable** within the video bounds. Position persists per integration. On video rect changes (resize, fullscreen enter/exit), the stored offset is clamped into the new bounds.
- No corner snapping is required; the designer can choose to suggest it via UX.

### States

Two interaction states:

- **Collapsed** — the compact default form. Visibility tracks user activity: shown on mouse-move or touch, hidden after 3 seconds of idle. Mirrors the existing FAB's auto-hide behavior so they appear and disappear together.
- **Expanded** — the full form. Triggered by hover on desktop or tap on touch. Collapses on pointer-leave or equivalent (no explicit close affordance).

Six visual substates that must be distinguishable. They drive content and visual treatment but do not change the spatial behavior:

| Substate | When | Suggested signal |
|---|---|---|
| `loading` | integration is running, no result yet | placeholder copy + neutral color |
| `matched` | match success, danmaku not yet mounted | match info, neutral or progress color |
| `mounted` | match success, comments loaded | match info + count, success color |
| `noMatch` | integration ran, found nothing | placeholder copy, neutral color |
| `error` | match or mount failed | error color, brief message |
| `disconnected` | extension lost connection to background | error color, distinct copy |

### Content

All of the following are surfaced when present. The designer chooses what fits in the collapsed state and what is reserved for expanded.

- Mount status (color or icon)
- Title (`MediaInfo.title`)
- Season decorator (`MediaInfo.seasonDecorator`) — optional
- Episode number (`MediaInfo.episode`)
- Episode title (`MediaInfo.episodeTitle`) — optional
- Comment count (length of comments array)
- Source / provider (which API the danmaku came from)

The collapsed state may show as little as a status dot and an episode number; the designer decides. The expanded state must surface every field above when present.

### Lifecycle

The panel mounts when **all** of these hold:
1. A `<video>` element is detected in this frame.
2. Manual mode is not active for the active config.
3. The info-panel setting is enabled (new setting, default on).

It unmounts when any condition flips false.

### Dismissal

No per-session × close affordance. The global setting toggle is the only off switch.

### Visual coherence with `SkipButton`

The existing in-video [SkipButton](packages/danmaku-anywhere/src/content/player/components/SkipButton/SkipButton.tsx) was hand-rolled with vanilla CSS because the player runtime is intentionally light. Code-wise it stays a separate component with its own owner ([videoSkip](packages/danmaku-anywhere/src/content/player/videoSkip)). **Visually**, the designer should restyle the SkipButton in the same pass so the two in-video surfaces share a design language and do not visually compete.

### Low-fi sketch (for reference, not prescription)

Collapsed: a small pill anchored to the left edge of the video, showing a status dot and a short label such as the episode number.

Expanded: a small card anchored to the left edge, showing status, title (with optional season decorator), episode number and title, comment count, and source. SkipButton, if active, sits in its current bottom-right area but visually matches.

Both states appear during chrome-visible moments and fade alongside the FAB and player controls when the pointer is idle.

## Architecture

### Frame placement

The info panel renders in the player frame (the frame containing the active `<video>`). Ownership lives in a new `InfoPanelService` mounted by [PlayerCommandHandler.service.ts](packages/danmaku-anywhere/src/content/player/PlayerCommandHandler.service.ts), following the same Inversify service pattern as `DanmakuManagerService`, `VideoSkipService`, etc.

The service mounts a React subtree into the existing player shadow root and injects its CSS as a string via the existing `injectCss(shadowRoot, [...])` pattern.

### No MUI in the player frame

The player runtime stays MUI-free. The info panel is plain React + a CSS module imported with `?inline`. The designer's deliverable lands inside this constraint: no MUI primitives, no theme provider, no `<Box>`. Plain HTML elements with classnames.

### Cross-frame data — controller pushes state

All data the panel needs already lives in the controller's zustand store. The player frame needs a mirror.

Add a new relay command `relay:command:syncPanelState` (controller → player), shaped:

```ts
{
  enabled: boolean,         // setting
  isManual: boolean,
  state: 'loading' | 'matched' | 'mounted' | 'noMatch' | 'error' | 'disconnected',
  media?: {
    title: string,
    seasonDecorator?: string,
    episode: number,
    episodeTitle?: string,
    originalTitle?: string,
  },
  commentCount?: number,
  provider?: string,
}
```

The controller subscribes to its own store, derives this slice, and pushes diffs (or full snapshots; diffing can be added later) to every connected player frame. Connected frames are already tracked via `relay:event:playerReady` / `relay:event:playerUnload`.

Each player frame holds a tiny zustand slice (`usePanelStateStore`) consumed by the info panel.

### Shared utilities to extract

The FAB has helpers that the info panel needs. Generalize and move them so both consumers can import:

- `useAutoHideOnIdle` — extracted from [useShowFab.tsx](packages/danmaku-anywhere/src/content/controller/ui/floatingButton/hooks/useShowFab.tsx). Pure logic, no MUI dependency.
- A frame-light draggable wrapper — the existing [DraggableContainer](packages/danmaku-anywhere/src/content/controller/ui/components/DraggableContainer) imports from `@mui/material` (Popper), so plan on a vanilla fork rather than direct reuse. Keep the FAB on the original; the fork lives in shared utilities for the player frame.
- `usePersistedPosition` — generalized from [usePersistedFabPosition.ts](packages/danmaku-anywhere/src/content/controller/ui/floatingButton/hooks/usePersistedFabPosition.ts), parameterizing the storage key and adding an optional bounds-clamping argument. The info panel passes the live video bounding rect as bounds.

### Position persistence

Stored in extension settings under a per-integration key (`infoPanelPosition.<integrationId>`). The same site under different integrations may have very different video layouts; per-integration is the right scope. The offset is relative to the video element's top-left and clamped to the video bounds on every read. When no integration is matched (e.g. `noMatch` state), fall back to a `default` key so the panel still has a persistent position across reloads.

### Lifecycle

- After any integration matches, the controller starts pushing `syncPanelState`. State pushes continue on every relevant store change.
- The player frame's `InfoPanelService` reacts to incoming state and to its own `videoNodeObs` / video presence signals to decide whether to mount the panel.
- On `videoChangeCount` increment, the panel re-attaches to the new video's bounding rect.
- On player frame unload (`pagehide`, non-BFCache), the service tears down and unregisters from the controller's mirror list (the existing `playerUnload` event already handles this).

### Settings

- New boolean `infoPanel.enabled` in the existing settings storage (default `true`).
- Toggle surfaced in the settings page next to the FAB toggle.
- The setting value is included in the `syncPanelState` payload so the player frame has a single source of truth.

### i18n

New keys go under `infoPanel.*`. Follow the existing `pnpm i18n extract` workflow after adding keys.

### Build / bundle posture

The info panel is small: a read-only widget, a draggable wrapper, an auto-hide hook, a handful of i18n strings. **Eager-loaded** into the player heavy handler (`PlayerCommandHandler`). The lazy-load posture is reserved for the deferred Fullscreen FAB mirror, where bundle size genuinely matters.

## Testing

- Unit / package tests for the shared utilities (`useAutoHideOnIdle`, `usePersistedPosition` with bounds clamping).
- e2e: one spec under `e2e/specs/in-video/info-panel.spec.ts` covering: panel visible when video + match, panel hidden in manual mode, panel state reflects mounted vs unmounted, position persists across reload. Use the existing `Popup` POM and `applyProfile` helpers; do not touch selectors or `chrome.storage` directly.
- No e2e coverage required for fullscreen behavior in this spec (fullscreen FAB mirror is a separate follow-up); the info panel happens to work in fullscreen by virtue of frame placement, but full coverage belongs with the mirror spec.

## Out of scope

- Quick-action controls in the info panel
- SkipButton code consolidation
- Fullscreen FAB mirror
- Anchor display
- Userscript / API surface
- Per-session dismissal
- Configurable corners or other position presets beyond the persisted draggable position

## Follow-ups

- **Fullscreen FAB mirror.** When a non-top player frame enters fullscreen, lazy-load and mount a mirror of the existing FAB tree (button + popover/window + context menu + pages) into that frame. Proxy all actions back to the top-frame controller via RPC. Hide the top-frame FAB while any frame is fullscreen. Position persistence open: share with top FAB or separate key. Detection rule: render mirror when `document.fullscreenElement` is non-null and the frame is not the top frame. Top-frame fullscreen on a video whose subtree does not contain the FAB is intentionally out of scope for the first cut.
- **Anchor display.** Render match info in the host page DOM near a configurable XPath element. Brainstorm its own spec; requirements likely differ (host page rather than video; potentially configurable per integration).
- **Diff transport for `syncPanelState`.** Start with full snapshots; add diffing if it becomes a hot path.

## Naming

- Component: `PlayerInfoPanel`
- Service: `InfoPanelService` (in `content/player/`)
- Setting: `infoPanel.enabled`
- Position storage prefix: `infoPanelPosition.<integrationId>`
- User-facing: "info panel"
