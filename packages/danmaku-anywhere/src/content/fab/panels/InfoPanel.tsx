import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Typography,
} from '@mui/material'

import { useStore } from '../../store/store'

export const InfoPanel = () => {
  const state = useStore()

  const displayState = {
    ...state,
    commentCount: state.comments.length,
    comments: undefined,
  }

  return (
    <Box component="pre" m={0}>
      {JSON.stringify(displayState, null, 2)}
      <Card>
        <CardContent>
          <Typography variant="h5" component="h2">
            {displayState.mediaInfo?.title}
          </Typography>
          <Typography variant="body2" component="p">
            Season {displayState.mediaInfo?.season}, Episode{' '}
            {displayState.mediaInfo?.episode}
          </Typography>
          <Typography variant="body2" component="p">
            {displayState.status}
          </Typography>
          <Typography variant="body2" component="p">
            {displayState.integration}
          </Typography>
          <Typography variant="body2" component="p">
            {displayState.commentCount} comments
          </Typography>
        </CardContent>
        <CardActions>
          <Button size="small">Play</Button>
          <Button size="small">Pause</Button>
        </CardActions>
      </Card>
    </Box>
  )
}
