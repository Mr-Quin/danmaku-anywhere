import { useSuspenseExtStorageQuery } from '@/common/storage/hooks/useSuspenseExtStorageQuery'
import type {
  LocalMatchingRule,
  LocalMatchingRuleOptionsOptions,
} from './schema'

export const useLocalMatchingRules = () => {
  const store = useSuspenseExtStorageQuery<LocalMatchingRuleOptionsOptions>(
    'localMatchingRule',
    {
      storageType: 'local',
    }
  )

  const addRule = async (rule: LocalMatchingRule) => {
    const { version, data: options } = store.data
    const existingIndex = options.rules.findIndex(
      (r) => r.mapKey === rule.mapKey
    )
    const newRules = [...options.rules]

    if (existingIndex >= 0) {
      newRules[existingIndex] = rule
    } else {
      newRules.push(rule)
    }

    await store.update.mutateAsync({
      version,
      data: { ...options, rules: newRules },
    })
  }

  const removeRule = async (mapKey: string) => {
    const { version, data: options } = store.data
    await store.update.mutateAsync({
      version,
      data: {
        ...options,
        rules: options.rules.filter((r) => r.mapKey !== mapKey),
      },
    })
  }

  const removeRules = async (mapKeys: string[]) => {
    const { version, data: options } = store.data
    const keySet = new Set(mapKeys)
    await store.update.mutateAsync({
      version,
      data: {
        ...options,
        rules: options.rules.filter((r) => !keySet.has(r.mapKey)),
      },
    })
  }

  const updateRules = async (
    updater: (rules: LocalMatchingRule[]) => LocalMatchingRule[]
  ) => {
    const { version, data: options } = store.data
    await store.update.mutateAsync({
      version,
      data: { ...options, rules: updater(options.rules) },
    })
  }

  return {
    ...store,
    rules: store.data.data.rules,
    addRule,
    removeRule,
    removeRules,
    updateRules,
  }
}
