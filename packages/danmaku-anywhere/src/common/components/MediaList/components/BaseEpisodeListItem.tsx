import { Download, Update } from '@mui/icons-material'
import {
  Box,
  CircularProgress,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Tooltip,
} from '@mui/material'
import { type ReactNode, Suspense } from 'react'

import { CoverImage } from '@/common/components/MediaList/components/CoverImage'
import { isNotCustom } from '@/common/danmaku/utils'
import type {
  CustomEpisode,
  EpisodeLite,
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { useTranslation } from 'react-i18next'

const isEpisodeLite = (
  episode: WithSeason<EpisodeMeta> | CustomEpisode
): episode is WithSeason<EpisodeLite> => {
  if (!isNotCustom(episode)) return false
  return 'id' in episode
}

type BaseEpisodeListItemProps<
  T extends WithSeason<EpisodeMeta> | CustomEpisode,
> = {
  showImage?: boolean
  isLoading?: boolean
  onClick: (meta: T) => void
  episode: T
  renderIcon?: () => ReactNode
  disabled?: boolean
}

export const BaseEpisodeListItem = <
  T extends WithSeason<EpisodeMeta> | CustomEpisode,
>({
  showImage = true,
  isLoading,
  onClick,
  renderIcon,
  episode,
  disabled,
}: BaseEpisodeListItemProps<T>) => {
  const { t } = useTranslation()

  const isLite = isEpisodeLite(episode)
  const isCustom = !isNotCustom(episode)

  const episodeLite = isLite ? episode : undefined

  const getIcon = () => {
    if (isLoading) return <CircularProgress size={24} />
    if (episodeLite) return <Update />
    return <Download />
  }

  return (
    <ListItem disablePadding>
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
        {renderIcon ? (
          renderIcon()
        ) : (
          <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
            {getIcon()}
          </ListItemIcon>
        )}
      </ListItemButton>
    </ListItem>
  )
}
