import { useStore } from '@/content/controller/store/store'
import { EditModeDrawer } from './EditModeDrawer'
import { EditModePicker } from './EditModePicker'
import { PickedElementOverlay } from './PickedElementOverlay'
import { ViewportIndicator } from './ViewportIndicator'

export function EditMode() {
  const active = useStore((s) => s.editMode.active)

  if (!active) {
    return null
  }

  return (
    <>
      <ViewportIndicator />
      <PickedElementOverlay />
      <EditModeDrawer />
      <EditModePicker />
    </>
  )
}
