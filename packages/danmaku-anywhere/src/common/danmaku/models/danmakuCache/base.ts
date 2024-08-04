import type { CachedComment } from '@danmaku-anywhere/danmaku-engine'

export interface BaseDanmakuCache {
  comments: CachedComment[]
  count: number
  version: number
  timeUpdated: number
}
