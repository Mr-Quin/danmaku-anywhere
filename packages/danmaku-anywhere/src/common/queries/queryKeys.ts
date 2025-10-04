import type { SeasonQueryFilter, SeasonSearchParams } from '@/common/anime/dto'
import type {
  CustomEpisodeQueryFilter,
  EpisodeQueryFilter,
} from '@/common/danmaku/dto'
import type { DanmakuSourceType } from '@/common/danmaku/enums'

export const storageQueryKeys = {
  external: (storageType: string, key: string | null | (string | null)[]) => {
    return [
      {
        scope: 'storage',
        kind: 'external',
        storageType,
        key,
      },
    ] as const
  },
}

export const imageQueryKeys = {
  image: (src: string) => [{ scope: 'image', src }] as const,
}

export const seasonQueryKeys = {
  all: () => [{ scope: 'season' }] as const,
  many: (data: SeasonQueryFilter) =>
    [{ scope: 'season', kind: 'getMany', ...data }] as const,
  search: (params?: SeasonSearchParams) =>
    [{ scope: 'season', kind: 'search', params }] as const,
  episodes: (provider: DanmakuSourceType, seasonId: string | number) =>
    [{ scope: 'season', kind: 'episodes', provider, seasonId }] as const,
  parseUrl: (url: string) =>
    [{ scope: 'season', kind: 'parseUrl', url }] as const,
}

export const seasonMapQueryKeys = {
  all: () => [{ scope: 'seasonMap' }] as const,
}

export const episodeQueryKeys = {
  all: () => [{ scope: 'episode' }] as const,
  filter: (params: EpisodeQueryFilter) =>
    [{ scope: 'episode', kind: 'filter', ...params }] as const,
  filterLite: (params: EpisodeQueryFilter) =>
    [{ scope: 'episode', kind: 'filterLite', ...params }] as const,
}

export const customEpisodeQueryKeys = {
  all: () => [{ scope: 'customEpisode' }] as const,
  filter: (params: CustomEpisodeQueryFilter) =>
    [{ scope: 'customEpisode', kind: 'filter', ...params }] as const,
  filterLite: (params: CustomEpisodeQueryFilter) =>
    [{ scope: 'customEpisode', kind: 'filterLite', ...params }] as const,
  macCms: (key: string) =>
    [{ scope: 'customEpisode', kind: 'macCms', key: key }] as const,
}

export const sourceQueryKeys = {
  bilibili: () => [{ scope: 'source', kind: 'bilibili' }] as const,
  tencent: () => [{ scope: 'source', kind: 'tencent' }] as const,
}

export const tabQueryKeys = {
  isConnected: () =>
    [
      {
        scope: 'tab',
        kind: 'isConnected',
      },
    ] as const,
  getState: () =>
    [
      {
        scope: 'tab',
        kind: 'getState',
      },
    ] as const,
}

export const controlQueryKeys = {
  activeTab: () =>
    [
      {
        scope: 'control',
        kind: 'activeTab',
      },
    ] as const,
  allFrames: () =>
    [
      {
        scope: 'control',
        kind: 'allFrames',
      },
    ] as const,
  releaseNotes: () =>
    [
      {
        scope: 'control',
        kind: 'releaseNotes',
      },
    ] as const,
  permissions: () =>
    [
      {
        scope: 'control',
        kind: 'permissions',
      },
    ] as const,
  getPlatformInfo: () =>
    [
      {
        scope: 'control',
        kind: 'getPlatformInfo',
      },
    ] as const,
}

export const alarmQueryKeys = {
  danmakuPurge: () =>
    [
      {
        scope: 'alarm',
        kind: 'danmakuPurge',
      },
    ] as const,
}

export const genAIQueryKeys = {
  extractTitle: (data: string) =>
    [
      {
        scope: 'genAI',
        kind: 'extractTitle',
        data,
      },
    ] as const,
}

export const fontQueryKeys = {
  listAll: () =>
    [
      {
        scope: 'font',
        kind: 'listAll',
      },
    ] as const,
}

export const configQueryKeys = {
  presets: () =>
    [
      {
        scope: 'config',
        kind: 'presets',
      },
    ] as const,
  maccms: () =>
    [
      {
        scope: 'config',
        kind: 'maccms',
      },
    ] as const,
  danmuicu: () =>
    [
      {
        scope: 'config',
        kind: 'danmuicu',
      },
    ] as const,
}
