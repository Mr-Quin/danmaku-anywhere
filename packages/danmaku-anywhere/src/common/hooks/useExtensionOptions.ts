import { ExtensionOptions } from '../constants/extensionOptions'

import { useExtStorage } from '@/common/hooks/useExtStorage'

export const useExtensionOptions = () => {
  const store = useExtStorage<ExtensionOptions>('extensionOptions', {
    storageType: 'sync',
  })

  const partialUpdate = async (config: Partial<ExtensionOptions>) => {
    if (store.isLoading || !store.data) return
    await store.update.mutateAsync({
      ...store.data,
      ...config,
    })
  }

  return { ...store, partialUpdate }
}
