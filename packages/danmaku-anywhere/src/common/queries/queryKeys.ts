import type { SeasonSearchParams } from '@/common/anime/dto'
import type { QueryEpisodeFilter } from '@/common/danmaku/dto'
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

export const mediaQueryKeys = {
  all: () => [{ scope: 'media' }] as const,
  search: (provider?: DanmakuSourceType, params?: SeasonSearchParams) =>
    [{ scope: 'media', kind: 'search', provider, params }] as const,
  episodes: (provider: DanmakuSourceType, seasonId: string | number) =>
    [{ scope: 'media', kind: 'episodes', provider, seasonId }] as const,
  parseUrl: (url: string) =>
    [{ scope: 'media', kind: 'parseUrl', url }] as const,
}

export const sourceQueryKeys = {
  bilibili: () => [{ scope: 'source', kind: 'bilibili' }] as const,
  tencent: () => [{ scope: 'source', kind: 'tencent' }] as const,
}

export const danmakuQueryKeys = {
  all: () => [{ scope: 'danmaku' }] as const,
  one: (params: QueryEpisodeFilter) =>
    [{ scope: 'danmaku', kind: 'getOne', ...params }] as const,
}

export const tabQueryKeys = {
  isConnected: () => [
    {
      scope: 'tab',
      kind: 'isConnected',
    },
  ],
  getState: () => [
    {
      scope: 'tab',
      kind: 'getState',
    },
  ],
}

export const controlQueryKeys = {
  activeTab: () => [
    {
      scope: 'control',
      kind: 'activeTab',
    },
  ],
  allFrames: () => [
    {
      scope: 'control',
      kind: 'allFrames',
    },
  ],
  releaseNotes: () => [
    {
      scope: 'control',
      kind: 'releaseNotes',
    },
  ],
  permissions: () => [
    {
      scope: 'control',
      kind: 'permissions',
    },
  ],
  getPlatformInfo: () => [
    {
      scope: 'control',
      kind: 'getPlatformInfo',
    },
  ],
}

export const alarmQueryKeys = {
  danmakuPurge: () => [
    {
      scope: 'alarm',
      kind: 'danmakuPurge',
    },
  ],
}

export const genAIQueryKeys = {
  extractTitle: () => [
    {
      scope: 'genAI',
      kind: 'extractTitle',
    },
  ],
}

export const fontQueryKeys = {
  listAll: () => [
    {
      scope: 'font',
      kind: 'listAll',
    },
  ],
}
