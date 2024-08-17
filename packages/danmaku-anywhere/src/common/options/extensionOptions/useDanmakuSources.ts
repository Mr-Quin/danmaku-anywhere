import { produce } from 'immer'

import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanmakuSources } from '@/common/options/extensionOptions/schema'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'

export const useDanmakuSources = () => {
  const { data, partialUpdate, ...rest } = useExtensionOptions()

  const sources = data.danmakuSources

  const sourcesList = [
    {
      key: 'dandanplay',
      provider: DanmakuSourceType.DanDanPlay,
      options: sources.dandanplay,
    },
    {
      key: 'bilibili',
      provider: DanmakuSourceType.Bilibili,
      options: sources.bilibili,
    },
  ] as const

  const enabledSources = sourcesList.filter((source) => source.options.enabled)

  const enabledProviders = enabledSources.map((source) => source.provider)

  const updateSource = async <K extends keyof DanmakuSources>(
    key: K,
    source: DanmakuSources[K]
  ) => {
    return partialUpdate(
      produce(data, (draft) => {
        draft.danmakuSources[key] = source
      })
    )
  }

  const toggleEnabled = async (
    key: keyof DanmakuSources,
    enabled?: boolean
  ) => {
    return updateSource(key, {
      ...sources[key],
      enabled: enabled ?? !sources[key].enabled,
    })
  }

  return {
    sources,
    sourcesList,
    enabledSources,
    enabledProviders,
    updateSource,
    toggleEnabled,
    ...rest,
  }
}
