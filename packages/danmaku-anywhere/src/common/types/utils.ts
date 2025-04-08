import { DanmakuSourceType } from '@/common/danmaku/enums'

export type NotPromise<T> = T extends Promise<never> ? never : T

// required for useQuery to accept placeholderData
export type NonFunctionGuard<T> = T extends Function ? never : T

export type ByProvider<K, T extends DanmakuSourceType> = Extract<
  K,
  { provider: T }
>
