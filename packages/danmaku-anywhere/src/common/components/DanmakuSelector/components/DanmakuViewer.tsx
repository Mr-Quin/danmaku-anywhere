import type {
  GenericEpisode,
  GenericEpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'
import { ArrowBack } from '@mui/icons-material'
import { Box, IconButton, Stack, Typography } from '@mui/material'
import type { ReactElement } from 'react'
import { Suspense } from 'react'
import { CommentsTable } from '@/common/components/CommentsTable'
import { NothingHere } from '@/common/components/NothingHere'
import { useCustomEpisodeSuspense } from '@/common/danmaku/queries/useCustomEpisodes'
import { useEpisodesSuspense } from '@/common/danmaku/queries/useEpisodes'
import { isNotCustom } from '@/common/danmaku/utils'
import { useRefreshDanmaku } from '@/popup/hooks/useRefreshDanmaku'
import { FullPageSpinner } from '../../FullPageSpinner'

interface DanmakuViewerProps {
  onClose: () => void
  episode: GenericEpisodeLite
}

const CommentsLoader = ({
  episodeLite,
}: {
  episodeLite: GenericEpisodeLite
}) => {
  const { refreshDanmaku, ...mutation } = useRefreshDanmaku()

  let episode: GenericEpisode | undefined

  const isCustom = !isNotCustom(episodeLite)

  if (isCustom) {
    const { data } = useCustomEpisodeSuspense({ id: episodeLite.id })
    episode = data[0]
  } else {
    const { data } = useEpisodesSuspense({ id: episodeLite.id })
    episode = data[0]
  }

  const canRefresh = episode !== undefined && !isCustom

  const handleRefresh = () => {
    if (!canRefresh) {
      return
    }
    void refreshDanmaku(episodeLite)
  }

  if (!episode) {
    return (
      <Box p={2} flexGrow={1}>
        <NothingHere />
      </Box>
    )
  }

  return (
    <CommentsTable
      comments={episode.comments}
      onRefresh={handleRefresh}
      showRefresh={canRefresh}
      isRefreshing={mutation.isPending}
    />
  )
}

export const DanmakuViewer = ({
  onClose,
  episode,
}: DanmakuViewerProps): ReactElement => {
  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Stack
        direction="row"
        alignItems="center"
        gap={1}
        p={1}
        borderBottom={1}
        borderColor="divider"
      >
        <IconButton onClick={onClose}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" noWrap>
          {episode.title}
        </Typography>
      </Stack>
      <Box flexGrow={1} overflow="hidden" display="flex" flexDirection="column">
        <Suspense fallback={<FullPageSpinner />}>
          <CommentsLoader episodeLite={episode} />
        </Suspense>
      </Box>
    </Box>
  )
}
