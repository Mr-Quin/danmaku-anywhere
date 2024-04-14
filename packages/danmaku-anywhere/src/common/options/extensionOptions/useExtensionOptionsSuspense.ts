import type {
  ExtensionOptions,
  ExtensionOptionsOptions,
} from '@/common/options/extensionOptions/extensionOptions'
import { useSuspenseExtStorageQuery } from '@/common/queries/extStorage/useSuspenseExtStorageQuery'

export const useExtensionOptionsSuspense = () => {
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
