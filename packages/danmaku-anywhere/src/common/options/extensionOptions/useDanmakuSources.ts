import { useMutation } from '@tanstack/react-query'
import { produce } from 'immer'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanmakuSources } from '@/common/options/extensionOptions/schema'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const useDanmakuSources = () => {
  const { data, partialUpdate, ...rest } = useExtensionOptions()

  const toast = useToast.use.toast()
  const { t } = useTranslation()

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

  const toggle = async (key: keyof DanmakuSources, enabled?: boolean) => {
    return updateSource(key, {
      ...sources[key],
      enabled: enabled ?? !sources[key].enabled,
    })
  }

  const toggleEnabled = useMutation({
    mutationFn: async ({
      key,
      checked,
    }: {
      key: (typeof sourcesList)[number]['key']
      checked: boolean
    }) => {
      if (key === 'bilibili') {
        if (!checked) return toggle('bilibili', false)
        await chromeRpcClient.bilibiliSetCookies()
        await toggle('bilibili', true)
      }
      return toggle(key, checked)
    },
    onError: (_, v) => {
      if (v.key === 'bilibili') {
        toast.error(t('danmakuSource.error.bilibiliAccess'))
      }
    },
  })

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
