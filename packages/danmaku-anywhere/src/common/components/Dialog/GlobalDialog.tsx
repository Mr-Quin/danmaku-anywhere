import type { ReactElement } from 'react'
import { DialogRender } from '@/common/components/Dialog/DialogRender'
import { useDialogStore } from './dialogStore'

export const GlobalDialog = (): ReactElement | null => {
  const dialogs = useDialogStore.use.dialogs()
  const loadingIds = useDialogStore.use.loadingIds()
  const closingIds = useDialogStore.use.closingIds()
  const close = useDialogStore.use.close()
  const remove = useDialogStore.use.remove()
  const setLoading = useDialogStore.use.setLoading()
  const globalContainer = useDialogStore.use.container()

  if (dialogs.length === 0) {
    return null
  }

  return (
    <>
      {dialogs.map((config) => {
        const { id } = config

        const isLoading = loadingIds.includes(id)
        const isClosing = closingIds.includes(id)

        return (
          <DialogRender
            key={id}
            config={config}
            isLoading={isLoading}
            isClosing={isClosing}
            onClose={close}
            setLoading={setLoading}
            globalContainer={globalContainer}
            onRemove={remove}
          />
        )
      })}
    </>
  )
}
