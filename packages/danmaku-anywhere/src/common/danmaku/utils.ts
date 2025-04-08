import { UnsupportedProviderException } from '@/common/danmaku/UnsupportedProviderException'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { EpisodeLiteV4, WithSeason } from '@/common/danmaku/types/v4/schema'

export const danmakuToString = (danmaku: WithSeason<EpisodeLiteV4>) => {
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
