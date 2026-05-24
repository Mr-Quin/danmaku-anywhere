import { useTheme } from '@mui/material'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { useStore } from '@/content/controller/store/store'
import { ElementSelector } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/editor/components/elementSelector/ElementSelector'
import { getFieldLabel } from './fields'
import { useEditModeIntegration } from './useEditModeIntegration'

export function EditModePicker() {
  const { t } = useTranslation()
  const theme = useTheme()
  const toast = useToast.use.toast()
  const editMode = useStore.use.editMode()
  const { setIsPicking } = useStore.use.integrationForm()
  const { setFieldSelector } = useEditModeIntegration()

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
        void setFieldSelector(target, xpath).catch((error: unknown) => {
          toast.error((error as Error).message)
        })
      }}
    />
  )
}
