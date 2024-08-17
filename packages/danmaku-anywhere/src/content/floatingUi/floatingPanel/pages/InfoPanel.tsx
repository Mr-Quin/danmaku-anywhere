import { Box } from '@mui/material'
import { produce } from 'immer'

import { useStore } from '../../../store/store'

export const InfoPanel = () => {
  const state = useStore()

  const displayState = produce(state, (draft) => {
    // @ts-expect-error
    delete draft.comments
    if (draft.danmakuLite) {
      if ('comments' in draft.danmakuLite) {
        delete draft.danmakuLite.comments
      }
    }
  })

  return (
    <Box component="pre" m={0} flexGrow={1}>
      {JSON.stringify(displayState, null, 2)}
    </Box>
  )
}
