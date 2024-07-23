import type {
  DanmakuOptions,
  DanmakuOptionsOptions,
} from '@/common/options/danmakuOptions/danmakuOptions'
import { useSuspenseExtStorageQuery } from '@/common/queries/extStorage/useSuspenseExtStorageQuery'

export const useDanmakuOptionsSuspense = () => {
  const store = useSuspenseExtStorageQuery<DanmakuOptionsOptions>(
    'danmakuOptions',
    {
      storageType: 'sync',
    }
  )

  const partialUpdate = async (config: DanmakuOptions) => {
    const { version } = store.data

    await store.update.mutateAsync({
      version,
      data: config,
    })
  }

  return { ...store, partialUpdate, data: store.data.data }
}
