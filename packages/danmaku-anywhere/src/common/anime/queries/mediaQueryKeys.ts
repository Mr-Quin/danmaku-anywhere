import type { MediaSearchParamsData } from '@/common/anime/dto'
import type { DanmakuSourceType } from '@/common/danmaku/enums'

export const mediaKeys = {
  all: () => [{ scope: 'media' }] as const,
  search: (params?: MediaSearchParamsData) =>
    [{ scope: 'media', kind: 'search', ...params }] as const,
  episodes: (provider: DanmakuSourceType, seasonId: string | number) =>
    [{ scope: 'media', kind: 'episodes', provider, seasonId }] as const,
  parseUrl: (url: string) =>
    [{ scope: 'media', kind: 'parseUrl', url }] as const,
}
