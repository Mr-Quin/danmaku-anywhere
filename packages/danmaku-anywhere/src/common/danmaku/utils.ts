import type { DanmakuSourceType } from '@/common/danmaku/enums'
import type {
  EpisodeLite,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'

class UnsupportedProviderException extends Error {
  constructor(provider: DanmakuSourceType, message?: string) {
    super(`Unsupported provider: ${provider}${message ? `: ${message}` : ''}`)
  }
}

export const danmakuToString = (danmaku: WithSeason<EpisodeLite>) => {
  return `${danmaku.season.title} - ${danmaku.title}`
}

export function assertProvider<
  T extends { provider: DanmakuSourceType },
  S extends DanmakuSourceType,
>(data: T, provider: S): asserts data is Extract<T, { provider: S }> {
  if (data.provider !== provider) {
    throw new UnsupportedProviderException(
      data.provider,
      `expected ${provider}`
    )
  }
}

export function isProvider<
  T extends { provider: DanmakuSourceType },
  S extends DanmakuSourceType,
>(data: T, provider: S): data is Extract<T, { provider: S }> {
  return data.provider === provider
}
