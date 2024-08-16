import type { GetEpisodeDto, MediaSearchParamsData } from '@/common/anime/dto'

export const mediaKeys = {
  all: () => [{ scope: 'media' }] as const,
  search: (params?: MediaSearchParamsData) =>
    [{ scope: 'media', kind: 'search', ...params }] as const,
  episodes: (data: GetEpisodeDto) =>
    [{ scope: 'media', kind: 'episodes', episodes: data }] as const,
}
