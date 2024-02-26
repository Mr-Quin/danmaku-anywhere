import type { DanmakuOptions } from '@danmaku-anywhere/danmaku-engine'

import type { DanmakuOptionsOptions } from '../constants/danmakuOptions'

import { useExtStorage } from '@/common/hooks/useExtStorage'

export const useDanmakuOptions = () => {
  const store = useExtStorage<DanmakuOptionsOptions>('danmakuOptions', {
    storageType: 'sync',
  })

  const partialUpdate = async (config: Partial<DanmakuOptions>) => {
    if (store.isLoading || !store.data) return

    const { data: prevOptions, version } = store.data

    store.update.mutateAsync({
      version,
      data: {
        ...prevOptions,
        ...config,
        style: {
          ...prevOptions.style,
          ...config.style,
        },
      },
    })
  }

  return { ...store, partialUpdate, data: store.data?.data }
}
