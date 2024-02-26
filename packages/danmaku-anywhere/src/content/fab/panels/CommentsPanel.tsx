import { Refresh } from '@mui/icons-material'
import {
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'

import { useStore } from '../../store/store'
import { CommentList } from '../components/CommentList'

import { tryCatch } from '@/common/utils'
import { useContentFetchDanmaku } from '@/content/hooks/useContentFetchDanmaku'
import { useToast } from '@/content/store/toastStore'

export const CommentsPanel = () => {
  const { comments, danmakuMeta } = useStore()
  const { toast } = useToast()

  const { fetch, isLoading } = useContentFetchDanmaku()

  const handleRefreshComments = async () => {
    if (!danmakuMeta) return

    const [, err] = await tryCatch(() =>
      fetch(danmakuMeta, undefined, { forceUpdate: true })
    )

    if (!err) {
      toast.success('Comments refreshed')
    }
  }

  return (
    <>
      {comments.length > 0 ? (
        <Stack height="100%">
          <Box px={2}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6">{comments.length} comments</Typography>
              <Tooltip title="Refresh comments">
                <IconButton color="primary" onClick={handleRefreshComments}>
                  {isLoading ? <CircularProgress size={24} /> : <Refresh />}
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
