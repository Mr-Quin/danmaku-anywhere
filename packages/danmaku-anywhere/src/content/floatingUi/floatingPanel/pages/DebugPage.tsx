import { Box } from '@mui/material'

import { useStore } from '../../../store/store'

export const DebugPage = () => {
  const state = useStore()

  const displayState: any = { ...state }

  delete displayState.comments
  if (displayState.danmakuLite) {
    if ('comments' in displayState.danmakuLite) {
      delete displayState.danmakuLite.comments
    }
  }
  displayState.allFrames = Array.from(displayState.allFrames)

  return (
    <Box component="pre" m={0} flexGrow={1}>
      {JSON.stringify(displayState, null, 2)}
    </Box>
  )
}
