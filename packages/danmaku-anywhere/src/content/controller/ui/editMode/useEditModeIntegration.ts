import { createIntegrationInput } from '@danmaku-anywhere/integration-policy'
import { useCallback } from 'react'
import type {
  Integration,
  IntegrationPolicy,
} from '@/common/options/integrationPolicyStore/schema'
import { useIntegrationPolicyStore } from '@/common/options/integrationPolicyStore/useIntegrationPolicyStore'
import { getRandomUUID } from '@/common/utils/utils'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
import { useActiveIntegration } from '@/content/controller/common/context/useActiveIntegration'
import type { FieldId } from './fields'

interface FieldUpdate {
  selector?: string | null
  regex?: string | null
}

export function useEditModeIntegration() {
  const integration = useActiveIntegration()
  const activeConfig = useActiveConfig()
  const { update, add } = useIntegrationPolicyStore()

  const writeField = useCallback(
    async (fieldId: FieldId, change: FieldUpdate) => {
      if (integration) {
        const nextPolicy = applyFieldChange(integration.policy, fieldId, change)
        await update(integration.id, { policy: nextPolicy })
        return
      }

      const seed = createIntegrationInput(activeConfig.name)
      const nextPolicy = applyFieldChange(
        seed.policy as IntegrationPolicy,
        fieldId,
        change
      )
      const next: Integration = {
        version: 3,
        id: getRandomUUID(),
        name: seed.name,
        policy: nextPolicy,
      }
      await add(next, activeConfig.id)
    },
    [integration, activeConfig.id, activeConfig.name, update, add]
  )

  return {
    integration,
    setFieldSelector: (fieldId: FieldId, xpath: string) =>
      writeField(fieldId, { selector: xpath }),
    clearFieldSelector: (fieldId: FieldId) =>
      writeField(fieldId, { selector: null }),
    setFieldRegex: (fieldId: FieldId, regex: string) =>
      writeField(fieldId, { regex }),
    clearFieldRegex: (fieldId: FieldId) => writeField(fieldId, { regex: null }),
  }
}

function applyFieldChange(
  policy: IntegrationPolicy,
  fieldId: FieldId,
  change: FieldUpdate
): IntegrationPolicy {
  const current = policy[fieldId]
  let selector = current.selector
  let regex = current.regex

  if (change.selector !== undefined) {
    selector =
      change.selector === null ? [] : [{ value: change.selector, quick: false }]
  }
  if (change.regex !== undefined) {
    regex =
      change.regex === null
        ? []
        : [{ value: change.regex, quick: false }, ...current.regex.slice(1)]
  }

  return {
    ...policy,
    [fieldId]: { selector, regex },
  }
}
