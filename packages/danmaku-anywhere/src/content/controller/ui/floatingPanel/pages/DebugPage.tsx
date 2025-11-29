import { Divider } from '@mui/material'
import { produce } from 'immer'
import { useDialogStore } from '@/common/components/Dialog/dialogStore'
import { ScrollBox } from '@/common/components/layout/ScrollBox'
import { useToast } from '@/common/components/Toast/toastStore'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { useStore } from '@/content/controller/store/store'

export const DebugPage = () => {
  const state = useStore()
  const toastState = useToast()
  const { data } = useExtensionOptions()
  const { dialogs, closingIds, loadingIds } = useDialogStore()

  // biome-ignore lint/suspicious/noExplicitAny: debug page does not need strict typing
  const displayState = produce(state, (draft: any) => {
    delete draft.danmaku.comments
    if (draft.danmaku.episodes) {
      for (const item of draft.danmaku.episodes) {
        if ('comments' in item) {
          delete item.comments
        }
      }
    }
    draft.frame.allFrames = Object.fromEntries(draft.frame.allFrames.entries())
    draft.options = data
  })

  return (
    <ScrollBox m={0} flexGrow={1} sx={{ overflow: 'auto' }}>
      <pre>
        {JSON.stringify(displayState, null, 2)}
        <Divider />
        {JSON.stringify(toastState, null, 2)}
        <Divider />
        {JSON.stringify({ dialogs, closingIds, loadingIds }, null, 2)}
      </pre>
    </ScrollBox>
  )
}
