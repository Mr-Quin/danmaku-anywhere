import type {
  ExtensionOptions,
  ExtensionOptionsOptions,
} from '../constants/extensionOptions'

import { useSuspenseExtStorageQuery } from './extStorage/useSuspenseExtStorageQuery'

export const useExtensionOptions = () => {
  const store = useSuspenseExtStorageQuery<ExtensionOptionsOptions>(
    'extensionOptions',
    {
      storageType: 'sync',
    }
  )

  const partialUpdate = async (config: Partial<ExtensionOptions>) => {
    const { version, data: options } = store.data

    await store.update.mutateAsync({
      data: {
        ...options,
        ...config,
      },
      version,
    })
  }

  return { ...store, partialUpdate, data: store.data.data }
}
