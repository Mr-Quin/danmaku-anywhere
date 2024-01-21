import { Box } from '@mui/material'
import { useStore } from '../store/store'

export const DanmakuInfo = () => {
  const state = useStore()

  const displayState = {
    ...state,
    commentCount: state.comments.length,
    comments: undefined,
  }

  return (
    <Box component="pre" m={0}>
      {JSON.stringify(displayState, null, 2)}
    </Box>
  )
}
