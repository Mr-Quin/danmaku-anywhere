import { useMutation } from '@tanstack/react-query'
import { useInjectService } from '@/common/hooks/useInjectService'
import { useSuspenseExtStorageQuery } from '@/common/storage/hooks/useSuspenseExtStorageQuery'
import type { LocalMatchingRuleStore } from './schema'
import { LocalMatchingRuleService } from './service'

export const useLocalMatchingRules = () => {
  const store = useSuspenseExtStorageQuery<LocalMatchingRuleStore>(
    'localMatchingRule',
    {
      storageType: 'local',
    }
  )

  return {
    ...store,
    rules: store.data.data.rules,
  }
}

export const useEditLocalMatchingRules = () => {
  const service = useInjectService(LocalMatchingRuleService)

  const addRule = useMutation({
    mutationFn: service.addRule.bind(service),
  })

  const removeRule = useMutation({
    mutationFn: service.removeRule.bind(service),
  })

  const removeRules = useMutation({
    mutationFn: service.removeRules.bind(service),
  })

  return {
    addRule,
    removeRule,
    removeRules,
  }
}
