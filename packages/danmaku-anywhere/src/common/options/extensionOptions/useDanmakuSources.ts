import { produce } from 'immer'
import { useMemo } from 'react'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanmakuSources } from '@/common/options/extensionOptions/schema'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'

export const useDanmakuSources = () => {
  const { data, partialUpdate, ...rest } = useExtensionOptions()

  const sources = data.danmakuSources

  const { sourcesList, enabledSources, enabledProviders } = useMemo(() => {
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
      {
        key: 'tencent',
        provider: DanmakuSourceType.Tencent,
        options: sources.tencent,
      },
      {
        key: 'custom',
        provider: DanmakuSourceType.MacCMS,
        options: sources.custom,
      },
    ] as const

    const enabledSources = sourcesList.filter(
      (source) => source.options.enabled
    )

    return {
      sourcesList,
      enabledSources,
      enabledProviders: enabledSources.map((source) => source.provider),
    }
  }, [sources])

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

  const toggle = async (key: keyof DanmakuSources, enabled?: boolean) => {
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
    toggle,
    ...rest,
  }
}
