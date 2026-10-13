import { useTheme } from '@mui/material'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'
import { extractFieldValue } from './extractFieldValue'
import { FIELD_ORDER, getFieldLabel } from './fields'
import { PickedFrame } from './PickedFrame'

export function PickedElementOverlay() {
  const { t } = useTranslation()
  const theme = useTheme()
  const portal = usePopup.use.highlighterPortal()
  const draft = useStore((s) => s.editMode.draft)
  const pickTarget = useStore.use.editMode().pickTarget

  if (!portal) {
    return null
  }

  const policy = draft?.policy

  const fields = FIELD_ORDER.map((fieldId) => {
    const extraction = extractFieldValue(policy, fieldId)
    if (!extraction.xpath) {
      return null
    }
    // While the picker is active for this field, hide its frame so the
    // picker's own hover indicator can take over.
    if (pickTarget === fieldId) {
      return null
    }
    return {
      fieldId,
      xpath: extraction.xpath,
      color: theme.palette.fieldAccent[fieldId],
      label: getFieldLabel(t, fieldId),
      parsed: extraction.parsed,
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
          parsed={f.parsed}
        />
      ))}
    </>,
    portal
  )
}
