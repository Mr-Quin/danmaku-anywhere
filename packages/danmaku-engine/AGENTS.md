# Agent context: packages/danmaku-engine

## Purpose

Renders danmaku on a video container. Wraps and converts data for the `@mr-quin/danmu` rendering library.

## Gotchas

- This is a thin wrapper around `@mr-quin/danmu` — rendering logic lives in that library, not here
- See `package.json` for available scripts and dependencies
- `@mr-quin/danmu` is pinned to an exact version (`0.20.0-rc.4`). `plugins/bindVideo.ts` relies on its internals when it refreezes after a paused seek, so recheck these on any upgrade:
  - `_setAction` waits two animation frames before a danmaku starts moving, and drops it if `freeze()` flips first (a scrolling one goes back to the stash, a top or bottom one is lost).
  - Scrolling pushes wait in the stash for the next render tick (every `interval` ms); the manager `render` hook fires before that tick creates their nodes.
  - `$createNode`, `$beforeMove`, `$removeNode` and `$destroyed` reach manager plugins for every danmaku, and putting a danmaku back in the stash emits `$removeNode`.
