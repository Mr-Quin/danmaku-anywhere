import { Refresh } from '@mui/icons-material'
import {
  CircularProgress,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'

import { useStore } from '../../store/store'
import { CommentsTable } from '../components/CommentsTable'

import { tryCatch } from '@/common/utils'
import { useFetchDanmakuMutation } from '@/content/hooks/useFetchDanmakuMutation'
import { useToast } from '@/content/store/toastStore'

export const CommentsPanel = () => {
  const { comments, danmakuMeta } = useStore()
  const { toast } = useToast()

  const { fetch, isPending } = useFetchDanmakuMutation()

  const handleRefreshComments = async () => {
    if (!danmakuMeta) return

    const [, err] = await tryCatch(() =>
      fetch({ danmakuMeta, options: { forceUpdate: true } })
    )

    if (!err) {
      toast.success('Comments refreshed')
    }
  }

  const hasComments = comments.length > 0

  return (
    <>
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
            Comments
          </Typography>
          {hasComments && (
            <Tooltip title="Refresh comments">
              <IconButton color="primary" onClick={handleRefreshComments}>
                {isPending ? <CircularProgress size={24} /> : <Refresh />}
              </IconButton>
            </Tooltip>
          )}
        </Toolbar>
        <CommentsTable comments={comments} />
      </Stack>
    </>
  )
}
