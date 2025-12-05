import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import { ChatBubbleOutline, InsertDriveFile } from '@mui/icons-material'
import { Stack, styled, Typography } from '@mui/material'
import type { ReactElement } from 'react'
import { isNotCustom } from '@/common/danmaku/utils'

interface EpisodeTreeItemProps {
  episode: GenericEpisodeLite
  label: string
}

const CommentCountIcon = styled(ChatBubbleOutline)(({ theme }) => {
  return {
    fontSize: theme.typography.caption.fontSize,
    fill: theme.palette.text.secondary,
  }
})

const CommentCount = ({ count }: { count: number }) => {
  return (
    <Stack direction="row" alignItems="center" gap={0.5}>
      <CommentCountIcon />
      <Typography variant="caption" color="text.secondary">
        {count}
      </Typography>
    </Stack>
  )
}

export const EpisodeTreeItem = ({
  episode,
  label,
}: EpisodeTreeItemProps): ReactElement => {
  const isCustom = !isNotCustom(episode)

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        width="100%"
        gap={1}
        py={0.5}
        overflow="hidden"
        pr={1}
      >
        {isCustom && <InsertDriveFile fontSize="small" />}
        <Typography noWrap variant="body2">
          {label}
        </Typography>
        <CommentCount count={episode.commentCount} />
      </Stack>
    </>
  )
}
