import { useTheme } from '@mui/material'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { Integration } from '@/common/options/integrationPolicyStore/schema'
import { useActiveIntegration } from '@/content/controller/common/context/useActiveIntegration'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'
import { FIELD_ORDER, type FieldId, getFieldLabel } from './fields'
import { PickedFrame } from './PickedFrame'

function getFirstSelector(
  integration: Integration | undefined,
  fieldId: FieldId
): string | null {
  const matcher = integration?.policy?.[fieldId]
  const first = matcher?.selector?.[0]?.value
  return first && first.length > 0 ? first : null
}

export function PickedElementOverlay() {
  const { t } = useTranslation()
  const theme = useTheme()
  const portal = usePopup.use.highlighterPortal()
  const integration = useActiveIntegration()
  const pickTarget = useStore.use.editMode().pickTarget

  if (!portal || pickTarget !== null) {
    return null
  }

  const fields = FIELD_ORDER.map((fieldId) => {
    const xpath = getFirstSelector(integration, fieldId)
    if (!xpath) {
      return null
    }
    return {
      fieldId,
      xpath,
      color: theme.palette.fieldAccent[fieldId],
      label: getFieldLabel(t, fieldId),
    }
  }).filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  return createPortal(
    <>
      {fields.map((f) => (
        <PickedFrame
          key={f.fieldId}
          fieldId={f.fieldId}
          color={f.color}
          label={f.label}
          xpath={f.xpath}
        />
      ))}
    </>,
    portal
  )
}
