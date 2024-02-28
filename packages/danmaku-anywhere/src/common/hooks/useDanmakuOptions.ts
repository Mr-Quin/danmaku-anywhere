import type { DanmakuOptions } from '@danmaku-anywhere/danmaku-engine'

import type { DanmakuOptionsOptions } from '../constants/danmakuOptions'

import { useSuspenseExtStorageQuery } from './extStorage/useSuspenseExtStorageQuery'

export const useDanmakuOptions = () => {
  const store = useSuspenseExtStorageQuery<DanmakuOptionsOptions>(
    'danmakuOptions',
    {
      storageType: 'sync',
    }
  )

  const partialUpdate = async (config: Partial<DanmakuOptions>) => {
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

  return { ...store, partialUpdate, data: store.data.data }
}
