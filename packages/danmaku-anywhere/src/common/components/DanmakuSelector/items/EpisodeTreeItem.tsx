import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import { ChatBubbleOutline } from '@mui/icons-material'
import { Stack, styled, Typography } from '@mui/material'
import type { ReactElement } from 'react'

interface EpisodeTreeItemProps {
  episode: GenericEpisodeLite
  onSelect: (episode: GenericEpisodeLite) => void
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
}: EpisodeTreeItemProps): ReactElement => {
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
        <Typography noWrap variant="body2">
          {episode.title}
        </Typography>
        <CommentCount count={episode.commentCount} />
      </Stack>
    </>
  )
}
