import { Refresh } from '@mui/icons-material'
import {
  CircularProgress,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'

import { useRefreshComments } from '../../../common/hooks/useRefreshComments'
import { useStore } from '../../../store/store'

import { CommentsTable } from '@/common/components/CommentsTable'

export const CommentsPanel = () => {
  const { comments } = useStore()

  const { refreshComments, isPending, canRefresh } = useRefreshComments()

  return (
    <Stack height="100%">
      <Toolbar
        variant="dense"
        sx={{
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
          minHeight: 32,
          backgroundColor: 'background.paper',
        }}
      >
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {comments.length} Comments
        </Typography>
        {canRefresh && (
          <Tooltip title="Refresh comments">
            <IconButton color="primary" onClick={refreshComments}>
              {isPending ? <CircularProgress size={24} /> : <Refresh />}
            </IconButton>
          </Tooltip>
        )}
      </Toolbar>
      <CommentsTable comments={comments} />
    </Stack>
  )
}
