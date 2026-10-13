import { useMutation } from '@tanstack/react-query'
import { useInjectService } from '@/common/hooks/useInjectService'
import { namingRuleDescriptor } from '@/common/options/optionStores'
import { useOptionStoreQuery } from '@/common/options/useOptionStoreQuery'
import { storageQueryKeys } from '@/common/queries/queryKeys'
import type { NamingRuleStore } from './schema'
import { NamingRuleService } from './service'

export const useNamingRules = () => {
  const store = useOptionStoreQuery<NamingRuleStore>(namingRuleDescriptor)

  return {
    ...store,
    rules: store.data.data.rules,
  }
}

export const useEditNamingRules = () => {
  const meta = {
    invalidates: [storageQueryKeys.external('local', ['localMatchingRule'])],
  }
  const service = useInjectService(NamingRuleService)

  const addRule = useMutation({
    mutationFn: service.addRule.bind(service),
    meta,
  })

  const removeRule = useMutation({
    mutationFn: service.removeRule.bind(service),
    meta,
  })

  const removeRules = useMutation({
    mutationFn: service.removeRules.bind(service),
    meta,
  })

  return { addRule, removeRule, removeRules }
}
