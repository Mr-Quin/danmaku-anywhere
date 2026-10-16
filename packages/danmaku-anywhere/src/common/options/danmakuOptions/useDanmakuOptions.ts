import type { DanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { danmakuOptionsDescriptor } from '@/common/options/optionStores'
import { useOptionStoreQuery } from '@/common/options/useOptionStoreQuery'

export const useDanmakuOptions = () => {
  const store = useOptionStoreQuery<DanmakuOptions>(danmakuOptionsDescriptor)

  const partialUpdate = async (config: DanmakuOptions) => {
    const { version } = store.data

    await store.update.mutateAsync({
      version,
      data: config,
    })
  }

  return { ...store, partialUpdate, data: store.data.data }
}
