import { Box } from '@mui/material'
import { produce } from 'immer'

import { useStore } from '@/content/controller/store/store'

export const DebugPage = () => {
  const state = useStore()

  const displayState = produce(state, (draft: any) => {
    delete draft.danmaku.comments
    if (draft.danmaku.danmakuLite) {
      if ('comments' in draft.danmaku.danmakuLite) {
        delete draft.danmaku.danmakuLite.comments
      }
    }
    draft.frame.allFrames = Object.fromEntries(draft.frame.allFrames.entries())
  })

  return (
    <Box component="pre" m={0} flexGrow={1}>
      {JSON.stringify(displayState, null, 2)}
    </Box>
  )
}
