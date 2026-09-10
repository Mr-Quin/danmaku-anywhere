import { createIntegrationInput } from '@danmaku-anywhere/integration-policy'
import { useCallback, useEffect } from 'react'
import type {
  Integration,
  IntegrationPolicy,
} from '@/common/options/integrationPolicyStore/schema'
import { useIntegrationPolicyStore } from '@/common/options/integrationPolicyStore/useIntegrationPolicyStore'
import { getRandomUUID } from '@/common/utils/utils'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
import { useActiveIntegration } from '@/content/controller/common/context/useActiveIntegration'
import { useStore } from '@/content/controller/store/store'
import type { FieldId } from './fields'

interface FieldUpdate {
  selector?: string | null
  regex?: string | null
}

// Seeds the editMode draft from the active integration when Edit Mode opens.
// Mount this hook in ONE component near the top of the Edit Mode tree;
// duplicating the call in transient children (e.g. RefinePopper) caused the
// draft to be reset every time those children unmount/remount.
export function useEditModeDraftSeed() {
  const integration = useActiveIntegration()
  const activeConfig = useActiveConfig()
  const active = useStore((s) => s.editMode.active)
  const draft = useStore((s) => s.editMode.draft)
  const initDraft = useStore((s) => s.editMode.initDraft)

  useEffect(() => {
    if (!active || draft) {
      return
    }
    if (integration) {
      initDraft({ policy: integration.policy, name: integration.name })
      return
    }
    const seed = createIntegrationInput(activeConfig.name)
    initDraft({
      policy: seed.policy as IntegrationPolicy,
      name: seed.name,
    })
  }, [active, draft, integration, activeConfig.name, initDraft])
}

export function useEditModeDraft() {
  const integration = useActiveIntegration()
  const activeConfig = useActiveConfig()
  const editMode = useStore.use.editMode()
  const { update, add } = useIntegrationPolicyStore()

  const updateField = useCallback(
    (fieldId: FieldId, change: FieldUpdate) => {
      const draft = useStore.getState().editMode.draft
      if (!draft) {
        return
      }
      editMode.updateDraftPolicy(
        applyFieldChange(draft.policy, fieldId, change)
      )
    },
    [editMode.updateDraftPolicy]
  )

  const save = useCallback(async () => {
    const draft = useStore.getState().editMode.draft
    if (!draft) {
      return
    }
    if (integration) {
      await update(integration.id, { policy: draft.policy })
      editMode.markSaved()
      return
    }
    const next: Integration = {
      ...createIntegrationInput(draft.name),
      id: getRandomUUID(),
      policy: draft.policy,
    }
    await add(next, activeConfig.id)
    editMode.markSaved()
  }, [integration, activeConfig.id, update, add, editMode.markSaved])

  const discard = useCallback(() => {
    if (integration) {
      editMode.initDraft({
        policy: integration.policy,
        name: integration.name,
      })
      return
    }
    const seed = createIntegrationInput(activeConfig.name)
    editMode.initDraft({
      policy: seed.policy as IntegrationPolicy,
      name: seed.name,
    })
  }, [integration, activeConfig.name, editMode.initDraft])

  return {
    integration,
    draft: editMode.draft,
    isDirty: editMode.isDirty,
    setFieldSelector: (fieldId: FieldId, xpath: string) =>
      updateField(fieldId, { selector: xpath }),
    clearFieldSelector: (fieldId: FieldId) =>
      updateField(fieldId, { selector: null }),
    setFieldRegex: (fieldId: FieldId, regex: string) =>
      updateField(fieldId, { regex }),
    clearFieldRegex: (fieldId: FieldId) =>
      updateField(fieldId, { regex: null }),
    save,
    discard,
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
