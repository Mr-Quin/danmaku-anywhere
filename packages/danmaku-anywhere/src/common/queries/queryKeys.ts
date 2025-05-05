import type { SeasonQueryFilter, SeasonSearchParams } from '@/common/anime/dto'
import type { EpisodeQueryFilter } from '@/common/danmaku/dto'
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

export const seasonQueryKeys = {
  image: (src: string) => [{ scope: 'season', kind: 'image', src }] as const,
  all: () => [{ scope: 'season' }] as const,
  many: (data: SeasonQueryFilter) =>
    [{ scope: 'season', kind: 'getMany', ...data }] as const,
  search: (provider?: DanmakuSourceType, params?: SeasonSearchParams) =>
    [{ scope: 'season', kind: 'search', provider, params }] as const,
  episodes: (provider: DanmakuSourceType, seasonId: string | number) =>
    [{ scope: 'season', kind: 'episodes', provider, seasonId }] as const,
  parseUrl: (url: string) =>
    [{ scope: 'season', kind: 'parseUrl', url }] as const,
}

export const episodeQueryKeys = {
  all: () => [{ scope: 'episode' }] as const,
  one: (params: EpisodeQueryFilter) =>
    [{ scope: 'episode', kind: 'getOne', ...params }] as const,
  many: (params: EpisodeQueryFilter) =>
    [{ scope: 'episode', kind: 'getMany', ...params }] as const,
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
  extractTitle: () =>
    [
      {
        scope: 'genAI',
        kind: 'extractTitle',
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
