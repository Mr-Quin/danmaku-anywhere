import {
  ExtensionOptions,
  ExtensionOptionsOptions,
} from '../constants/extensionOptions'

import { useExtStorage } from '@/common/hooks/useExtStorage'

export const useExtensionOptions = () => {
  const store = useExtStorage<ExtensionOptionsOptions>('extensionOptions', {
    storageType: 'sync',
  })

  const partialUpdate = async (config: Partial<ExtensionOptions>) => {
    if (store.isLoading || !store.data) return

    const { version, data: options } = store.data

    await store.update.mutateAsync({
      data: {
        ...options,
        ...config,
      },
      version,
    })
  }

  return { ...store, partialUpdate, data: store.data?.data }
}
