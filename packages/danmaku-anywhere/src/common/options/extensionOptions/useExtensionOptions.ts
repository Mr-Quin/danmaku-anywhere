import type { ExtensionOptions } from '@/common/options/extensionOptions/schema'
import { extensionOptionsDescriptor } from '@/common/options/optionStores'
import { useOptionStoreQuery } from '@/common/options/useOptionStoreQuery'

export const useExtensionOptions = () => {
  const store = useOptionStoreQuery<ExtensionOptions>(
    extensionOptionsDescriptor
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
