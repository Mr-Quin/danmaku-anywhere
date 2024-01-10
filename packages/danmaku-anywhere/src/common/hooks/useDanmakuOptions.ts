import { DanmakuOptions } from '@danmaku-anywhere/danmaku-engine'
import { useExtStorage } from '@/common/hooks/useExtStorage'

export const useDanmakuOptions = () => {
  const store = useExtStorage<DanmakuOptions>('danmakuOptions', {
    storageType: 'sync',
  })

  const partialUpdate = (config: Partial<DanmakuOptions>) => {
    if (store.isLoading || !store.data) return
    store.update.mutateAsync({
      ...store.data,
      ...config,
      style: {
        ...store.data.style,
        ...config.style,
      },
    })
  }

  return { ...store, partialUpdate }
}
