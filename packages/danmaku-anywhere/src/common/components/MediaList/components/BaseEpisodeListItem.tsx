import type {
  CustomEpisodeLite,
  EpisodeLite,
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import {
  Box,
  CircularProgress,
  ListItem,
  ListItemButton,
  ListItemText,
  Skeleton,
  Tooltip,
} from '@mui/material'
import { type ReactNode, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { CoverImage } from '@/common/components/MediaList/components/CoverImage'
import { isNotCustom } from '@/common/danmaku/utils'

const isEpisodeLite = (
  episode: WithSeason<EpisodeMeta> | CustomEpisodeLite
): episode is WithSeason<EpisodeLite> => {
  if (!isNotCustom(episode)) return false
  return 'id' in episode
}

type BaseEpisodeListItemProps<
  T extends WithSeason<EpisodeMeta> | CustomEpisodeLite,
> = {
  showImage?: boolean
  isLoading?: boolean
  onClick: (meta: T) => void
  renderSecondaryAction?: () => ReactNode
  episode: T
  disabled?: boolean
}

export const BaseEpisodeListItem = <
  T extends WithSeason<EpisodeMeta> | CustomEpisodeLite,
>({
  showImage = true,
  isLoading,
  onClick,
  renderSecondaryAction: renderSecondaryActionProp,
  episode,
  disabled,
}: BaseEpisodeListItemProps<T>) => {
  const { t } = useTranslation()

  const isLite = isEpisodeLite(episode)
  const isCustom = !isNotCustom(episode)

  const episodeLite = isLite ? episode : undefined

  const renderSecondaryAction = () => {
    if (renderSecondaryActionProp) {
      return renderSecondaryActionProp()
    }
    return null
  }

  return (
    <ListItem disablePadding secondaryAction={renderSecondaryAction()}>
      <ListItemButton
        onClick={() => onClick(episode)}
        disabled={isLoading || disabled}
      >
        {showImage && !isCustom && episode.imageUrl && (
          <Box width={40} mr={2} flexShrink={0}>
            <Suspense fallback={<Skeleton width={40} height={40} />}>
              <CoverImage
                src={episode.imageUrl}
                widthRatio={1}
                heightRatio={1}
              />
            </Suspense>
          </Box>
        )}
        <Tooltip
          title={episode.title}
          enterDelay={1000}
          enterNextDelay={1000}
          placement="top"
        >
          <ListItemText
            primary={episode.title}
            slotProps={{
              primary: {
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              },
            }}
            secondary={
              episodeLite
                ? `${new Date(episodeLite.timeUpdated).toLocaleDateString()} -  ${t(
                    'danmaku.commentCounted',
                    {
                      count: episodeLite.commentCount,
                    }
                  )}`
                : null
            }
          />
        </Tooltip>
        {!renderSecondaryActionProp && isLoading && (
          <CircularProgress size={24} sx={{ color: 'text.primary' }} />
        )}
      </ListItemButton>
    </ListItem>
  )
}
