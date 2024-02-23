import { Refresh } from '@mui/icons-material'
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material'

import { useStore } from '../../store/store'
import { CommentList } from '../components/CommentList'

export const CommentsPanel = () => {
  const { comments, status } = useStore()

  return (
    <>
      {status !== 'stopped' && comments.length > 0 ? (
        <Stack height="100%">
          <Box px={2}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6">{comments.length} comments</Typography>
              <Tooltip title="Refresh comments">
                <IconButton color="primary">
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
          <CommentList comments={comments} px={2} />
        </Stack>
      ) : (
        <Typography variant="h6">No comments loaded</Typography>
      )}
    </>
  )
}
