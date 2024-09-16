import { produce } from 'immer'
import { useMemo } from 'react'

import type { IntegrationPolicyItem } from '@/common/options/integrationPolicyStore/schema'
import type { Options } from '@/common/options/OptionsService/types'
import { useSuspenseExtStorageQuery } from '@/common/storage/hooks/useSuspenseExtStorageQuery'
import { createDownload } from '@/common/utils/utils'

export const useIntegrationPolicyStore = () => {
  const {
    data,
    update: updateMutation,
    ...rest
  } = useSuspenseExtStorageQuery<Options<IntegrationPolicyItem[]>>(
    'xpathPolicy',
    {
      storageType: 'local',
    }
  )

  const methods = useMemo(() => {
    const get = (id: string) => {
      const { data: policies } = data

      return policies.find((item) => item.id === id)
    }

    const update = async (
      id: string,
      config: Partial<IntegrationPolicyItem>
    ) => {
      const { data: policies, version } = data

      const prevPolicy = policies.find((item) => item.id === id)

      if (!prevPolicy) throw new Error(`Policy not found: "${id}"`)

      // replace the stored config with the new one
      const newData = produce(policies, (draft) => {
        const index = draft.findIndex((item) => item.id === id)
        draft[index] = {
          ...draft[index],
          ...config,
        }
      })

      await updateMutation.mutateAsync({ data: newData, version })
    }

    const add = async (config: IntegrationPolicyItem) => {
      const { data: policy, version } = data

      await updateMutation.mutateAsync({
        data: [...policy, config],
        version,
      })
    }

    const remove = async (id: string) => {
      const { data: configs, version } = data

      const index = configs.findIndex((item) => item.id === id)

      if (index === -1) throw new Error(`Policy not found: "${id}"`)

      const newData = produce(configs, (draft) => {
        draft.splice(index, 1)
      })

      await updateMutation.mutateAsync({ data: newData, version })
    }

    const exportAll = async () => {
      const { data: configs } = data

      return createDownload(
        new Blob([JSON.stringify(configs, null, 2)], { type: 'text/json' }),
        'config.json'
      )
    }

    return {
      get,
      update,
      add,
      remove,
      exportAll,
    }
  }, [data, updateMutation.mutateAsync])

  const policies: IntegrationPolicyItem[] = data.data

  return {
    ...rest,
    updateMutation,
    policies,
    ...methods,
  }
}
