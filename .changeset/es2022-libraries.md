---
'@danmaku-anywhere/result': patch
'@danmaku-anywhere/danmaku-converter': patch
'@danmaku-anywhere/danmaku-provider': patch
---

Compiled for ES2022, so class fields stay native instead of becoming `Object.defineProperty` calls. Behavior is unchanged.
