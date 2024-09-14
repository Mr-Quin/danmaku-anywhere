import type { MediaSearchParams } from '@/common/anime/dto'
import type { DanmakuSourceType } from '@/common/danmaku/enums'

export const mediaKeys = {
  all: () => [{ scope: 'media' }] as const,
  search: (provider?: DanmakuSourceType, params?: MediaSearchParams) =>
    [{ scope: 'media', kind: 'search', provider, params }] as const,
  episodes: (provider: DanmakuSourceType, seasonId: string | number) =>
    [{ scope: 'media', kind: 'episodes', provider, seasonId }] as const,
  parseUrl: (url: string) =>
    [{ scope: 'media', kind: 'parseUrl', url }] as const,
}
