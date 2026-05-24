import { useTheme } from '@mui/material'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '@/content/controller/store/store'
import { ElementSelector } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/editor/components/elementSelector/ElementSelector'
import { getFieldLabel } from './fields'
import { useEditModeDraft } from './useEditModeIntegration'

export function EditModePicker() {
  const { t } = useTranslation()
  const theme = useTheme()
  const editMode = useStore.use.editMode()
  const { setIsPicking } = useStore.use.integrationForm()
  const { setFieldSelector } = useEditModeDraft()

  const target = editMode.pickTarget

  useEffect(() => {
    setIsPicking(!!target)
  }, [target, setIsPicking])

  if (!target) {
    return null
  }

  return (
    <ElementSelector
      enable
      field={{
        color: theme.palette.fieldAccent[target],
        label: getFieldLabel(t, target),
      }}
      onExit={() => {
        editMode.setPickTarget(null)
      }}
      onSelect={(xpath) => {
        setFieldSelector(target, xpath)
      }}
    />
  )
}
