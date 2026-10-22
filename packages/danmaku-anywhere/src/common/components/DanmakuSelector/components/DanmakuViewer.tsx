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
import { isSourceEpisode } from '@/common/danmaku/utils'
import { useCanRefetchDanmaku } from '@/common/providers/useSourceCapabilities'
import { useRefreshDanmaku } from '@/popup/hooks/useRefreshDanmaku'
import { FullPageSpinner } from '../../FullPageSpinner'

interface DanmakuViewerProps {
  onClose: () => void
  episode: GenericEpisodeLite
}

function EpisodeComments({
  episodeLite,
  episode,
}: {
  episodeLite: GenericEpisodeLite
  episode: GenericEpisode | undefined
}) {
  const { refreshDanmaku, ...mutation } = useRefreshDanmaku()
  const refetchable = useCanRefetchDanmaku(episodeLite)

  const canRefresh =
    episode !== undefined && isSourceEpisode(episodeLite) && refetchable

  const handleRefresh = () => {
    if (!canRefresh) {
      return
    }
    refreshDanmaku(episodeLite)
  }

  if (!episode) {
    return (
      <Box
        sx={{
          p: 2,
          flexGrow: 1,
        }}
      >
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

function SourceCommentsLoader({
  episodeLite,
}: {
  episodeLite: GenericEpisodeLite
}) {
  const { data } = useEpisodesSuspense({ id: episodeLite.id })
  return <EpisodeComments episodeLite={episodeLite} episode={data[0]} />
}

function CustomCommentsLoader({
  episodeLite,
}: {
  episodeLite: GenericEpisodeLite
}) {
  const { data } = useCustomEpisodeSuspense({ id: episodeLite.id })
  return <EpisodeComments episodeLite={episodeLite} episode={data[0]} />
}

function CommentsLoader({ episodeLite }: { episodeLite: GenericEpisodeLite }) {
  if (isSourceEpisode(episodeLite)) {
    return <SourceCommentsLoader episodeLite={episodeLite} />
  }
  return <CustomCommentsLoader episodeLite={episodeLite} />
}

export const DanmakuViewer = ({
  onClose,
  episode,
}: DanmakuViewerProps): ReactElement => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          gap: 1,
          p: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <IconButton onClick={onClose}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" noWrap>
          {episode.title}
        </Typography>
      </Stack>
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Suspense fallback={<FullPageSpinner />}>
          <CommentsLoader episodeLite={episode} />
        </Suspense>
      </Box>
    </Box>
  )
}
