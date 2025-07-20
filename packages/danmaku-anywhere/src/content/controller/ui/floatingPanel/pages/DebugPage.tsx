import { Box, Divider } from '@mui/material'
import { produce } from 'immer'

import { useToast } from '@/common/components/Toast/toastStore'
import { useStore } from '@/content/controller/store/store'

export const DebugPage = () => {
  const state = useStore()
  const toastState = useToast()

  // biome-ignore lint/suspicious/noExplicitAny: debug page does not need strict typing
  const displayState = produce(state, (draft: any) => {
    delete draft.danmaku.comments
    if (draft.danmaku.danmakuLite) {
      for (const item of draft.danmaku.danmakuLite) {
        if ('comments' in item) {
          delete item.comments
        }
      }
    }
    draft.frame.allFrames = Object.fromEntries(draft.frame.allFrames.entries())
  })

  return (
    <Box component="pre" m={0} flexGrow={1}>
      {JSON.stringify(displayState, null, 2)}
      <Divider />
      {JSON.stringify(toastState, null, 2)}
    </Box>
  )
}
