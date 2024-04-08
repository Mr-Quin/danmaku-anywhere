import type {
  DanmakuOptions,
  DanmakuOptionsOptions,
} from '../constants/danmakuOptions'

import { useSuspenseExtStorageQuery } from './extStorage/useSuspenseExtStorageQuery'

/**
 * Suspends
 */
export const useDanmakuOptions = () => {
  const store = useSuspenseExtStorageQuery<DanmakuOptionsOptions>(
    'danmakuOptions',
    {
      storageType: 'sync',
    }
  )

  const partialUpdate = async (config: DanmakuOptions) => {
    const { version } = store.data

    store.update.mutateAsync({
      version,
      data: config,
    })
  }

  return { ...store, partialUpdate, data: store.data.data }
}
