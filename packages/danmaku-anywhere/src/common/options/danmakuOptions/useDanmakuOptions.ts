import type {
  DanmakuOptions,
  DanmakuOptionsOptions,
} from '@/common/options/danmakuOptions/constant'
import { useSuspenseExtStorageQuery } from '@/common/storage/hooks/useSuspenseExtStorageQuery'

export const useDanmakuOptions = () => {
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
