import type {
  GenericEpisode,
  GenericEpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'
import { Close } from '@mui/icons-material'
import { Box, Dialog, IconButton, Stack, Typography } from '@mui/material'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { CommentsTable } from '@/common/components/CommentsTable'
import { NothingHere } from '@/common/components/NothingHere'
import { useCustomEpisodeSuspense } from '@/common/danmaku/queries/useCustomEpisodes'
import { useEpisodesSuspense } from '@/common/danmaku/queries/useEpisodes'
import { isNotCustom } from '@/common/danmaku/utils'
import { useRefreshDanmaku } from '@/popup/hooks/useRefreshDanmaku'

interface DanmakuViewerDialogProps {
  open: boolean
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

  if (!isNotCustom(episodeLite)) {
    const { data } = useCustomEpisodeSuspense({ id: episodeLite.id })
    episode = data[0]
  } else {
    const { data } = useEpisodesSuspense({ id: episodeLite.id })
    episode = data[0]
  }

  const canRefresh = episode !== undefined && !isNotCustom(episode)

  const handleRefresh = () => {
    if (!canRefresh || !isNotCustom(episode)) {
      return
    }
    void refreshDanmaku(episode)
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

export const DanmakuViewerDialog = ({
  open,
  onClose,
  episode,
}: DanmakuViewerDialogProps) => {
  const { t } = useTranslation()

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: { display: 'flex', flexDirection: 'column' },
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        p={2}
        borderBottom={1}
        borderColor="divider"
      >
        <Typography variant="h6">{episode.title}</Typography>
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </Stack>
      <Box flexGrow={1} overflow="hidden" display="flex" flexDirection="column">
        <Suspense fallback={<Box p={2}>{t('common.loading')}</Box>}>
          <CommentsLoader episodeLite={episode} />
        </Suspense>
      </Box>
    </Dialog>
  )
}
